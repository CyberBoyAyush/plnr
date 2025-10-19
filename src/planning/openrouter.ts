import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import chalk from 'chalk';

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/cyberboyayush/plnr',
    'X-Title': 'Plnr (Planner)'
  }
});

export async function callOpenRouter(
  prompt: string,
  isPlanning: boolean = true,
  model: string = config.model
): Promise<string> {
  const spinner = ora({
    text: isPlanning
      ? `🤖 Generating implementation plan... ${chalk.gray('(Ctrl+C to cancel)')}`
      : `💬 Thinking... ${chalk.gray('(Ctrl+C to cancel)')}`,
    color: 'cyan'
  }).start();

  // Setup interrupt handler
  const abortController = new AbortController();
  let cancelled = false;

  const sigintHandler = () => {
    cancelled = true;
    abortController.abort();
    spinner.fail(chalk.yellow('✕ Interrupted by user'));
    process.removeListener('SIGINT', sigintHandler);
  };

  // Temporarily override SIGINT for cancellation
  process.on('SIGINT', sigintHandler);

  try {
    logger.debug(`Using model: ${model}`);

    const systemPrompt = isPlanning
      ? 'You are an expert software architect. Analyze codebases and create detailed, actionable implementation plans. Be specific, thorough, and practical. Always respond with valid JSON only.'
      : 'You are an expert software architect and helpful coding assistant. Answer questions conversationally but precisely. Reference specific files and code when relevant. Always respond with valid JSON only.';

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: isPlanning ? 0.5 : 0.7,
      max_tokens: isPlanning ? 4000 : 2000
    }, {
      signal: abortController.signal as any
    });

    const response = completion.choices[0]?.message?.content;

    // Cleanup
    process.removeListener('SIGINT', sigintHandler);

    if (cancelled) {
      throw new Error('Request cancelled by user');
    }

    if (!response) {
      spinner.fail('No response from AI');
      throw new Error('No response from OpenRouter');
    }

    spinner.succeed(`✓ AI analysis complete (${chalk.gray(model)})`);
    logger.debug('OpenRouter response received');
    return response;
  } catch (error: any) {
    // Cleanup
    process.removeListener('SIGINT', sigintHandler);

    if (cancelled || error.message === 'Request cancelled by user' || error.name === 'AbortError') {
      throw new Error('Request cancelled by user');
    }

    spinner.fail('AI request failed');
    logger.error('OpenRouter API error:', error.message || error);
    throw error;
  }
}

export async function callOpenRouterWithTools(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  model: string = config.model,
  maxTokens: number = 4000,
  streaming: boolean = false,
  abortSignal?: AbortSignal
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    logger.debug(`Calling OpenRouter with tools. Model: ${model}, Streaming: ${streaming}`);

    // Non-streaming mode (for tool calls)
    if (!streaming) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: maxTokens
      }, abortSignal ? { signal: abortSignal as any } : undefined);

      logger.debug(`Tool call response received. Finish reason: ${completion.choices[0]?.finish_reason}`);
      return completion;
    }

    // Streaming mode (for final text response) - show spinner with token count
    const spinner = ora({
      text: chalk.white('Generating response...'),
      color: 'white'
    }).start();

    const stream = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true
    }, abortSignal ? { signal: abortSignal as any } : undefined);

    let fullContent = '';
    let fullToolCalls: any[] = [];
    let finishReason = '';
    let tokenCount = 0;

    // Process stream chunks silently (no output)
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Accumulate content and count tokens (rough estimate: ~4 chars per token)
      if (delta?.content) {
        fullContent += delta.content;
        tokenCount = Math.floor(fullContent.length / 4);
        spinner.text = chalk.white(`Generating response... `) + chalk.dim(`(~${tokenCount} tokens)`);
      }

      // Accumulate tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;
          if (!fullToolCalls[index]) {
            fullToolCalls[index] = {
              id: toolCall.id || '',
              type: 'function',
              function: { name: '', arguments: '' }
            };
          }
          if (toolCall.function?.name) {
            fullToolCalls[index].function.name = toolCall.function.name;
          }
          if (toolCall.function?.arguments) {
            fullToolCalls[index].function.arguments += toolCall.function.arguments;
          }
          if (toolCall.id) {
            fullToolCalls[index].id = toolCall.id;
          }
        }
      }

      // Capture finish reason
      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
    }

    // Stop spinner
    spinner.stop();

    // Construct a ChatCompletion-like response
    const completion: OpenAI.Chat.Completions.ChatCompletion = {
      id: 'streamed-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: fullToolCalls.length > 0 ? fullToolCalls : undefined,
          refusal: null
        },
        logprobs: null,
        finish_reason: finishReason as any
      }],
      usage: undefined
    };

    logger.debug(`Streaming complete. Finish reason: ${finishReason}`);
    return completion;
  } catch (error: any) {
    logger.error('OpenRouter tool call error:', error.message || error);
    throw error;
  }
}
