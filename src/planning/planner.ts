import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { CodebaseContext, Plan } from '../types/index.js';
import { buildPlanningPrompt } from './prompt-builder.js';
import { callOpenRouterWithTools } from './openrouter.js';
import { logger } from '../utils/logger.js';
import { tools } from '../tools/definitions.js';
import { executeToolCall } from '../tools/handlers.js';
import chalk from 'chalk';

export async function generatePlan(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true
): Promise<Plan> {
  try {
    logger.debug('Building prompt for AI...');

    const prompt = buildPlanningPrompt(context, task, conversationHistory, isPlanning);
    logger.debug(`Prompt size: ${prompt.length} characters`);

    // Build messages for tool calling
    const systemPrompt = isPlanning
      ? 'You are an expert software architect. Use the provided tools to explore and analyze the codebase thoroughly. Search for relevant files, read code, and gather information before creating your implementation plan. Be specific, thorough, and practical. Always respond with valid JSON only when providing the final plan.'
      : `You are an expert software architect and helpful coding assistant.

INSTRUCTIONS:
1. Use tools EFFICIENTLY to find information:
   - Start with search_files to locate relevant files
   - Use read_file only on the most relevant files
   - Avoid redundant tool calls (ls, execute_command for basic listing)
   - Focus on files that directly answer the question

2. After gathering information (typically 2-4 tool calls), provide a DETAILED response in plain text:
   - List specific details from the actual code you read
   - Include function names, variable names, file paths
   - Show code snippets when relevant
   - Provide complete lists (e.g., if asked for "all models", list EVERY model from the file)
   - Reference actual code content, not generic descriptions

3. Format using markdown:
   - Use bullet points for lists
   - Use code blocks for code examples
   - Use headers for sections

IMPORTANT:
- Do NOT waste tool calls on basic directory listing
- Use search_files to find files, then read_file to get content
- Respond in natural language (NOT JSON) after gathering info
- Be thorough but efficient with tool usage`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: isPlanning ? prompt : task }
    ];

    // Tool calling loop - OpenRouter has no hard limit, but we set a reasonable max
    const maxIterations = 25;
    let iteration = 0;
    let finalResponse: string | null = null;
    let totalTokensUsed = 0;

    while (iteration < maxIterations) {
      iteration++;
      logger.debug(`Tool calling iteration ${iteration}/${maxIterations}`);

      // Use more tokens for chat mode to allow detailed responses
      const maxTokens = isPlanning ? 4000 : 8000;
      const completion = await callOpenRouterWithTools(messages, tools, 'x-ai/grok-code-fast-1', maxTokens);
      const message = completion.choices[0]?.message;

      // Track token usage
      if (completion.usage) {
        totalTokensUsed += completion.usage.total_tokens || 0;
        const tokensInK = (totalTokensUsed / 1000).toFixed(1);
        process.stdout.write(`\r${chalk.dim(`  Tokens: ${tokensInK}k`)}`);
      }

      if (!message) {
        throw new Error('No message in completion');
      }

      // Add assistant's message to conversation
      messages.push(message);

      // Check if we have tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          // Show minimal tool usage
          const displayArg = args.file_path || args.pattern || args.path || args.command || '';
          process.stdout.write(chalk.gray(`  ${toolName}(${displayArg}) `));

          const result = await executeToolCall(toolName, args, context.projectRoot);

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.success ? (result.result || 'Success') : `Error: ${result.error}`
          });

          if (result.success) {
            console.log(chalk.green('✓'));
          } else {
            console.log(chalk.red('✗'));
          }
        }
      } else {
        // No more tool calls, we have the final response
        finalResponse = message.content || '';
        break;
      }

      // Safety check
      if (iteration >= maxIterations) {
        logger.warn('Max tool calling iterations reached');
        finalResponse = message.content || '';
        break;
      }
    }

    if (!finalResponse) {
      throw new Error('No final response from AI');
    }

    // Clear the token counter line
    if (totalTokensUsed > 0) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
    }

    // For chat mode, return response as-is wrapped in Plan structure
    if (!isPlanning) {
      return {
        summary: finalResponse,
        steps: [],
        dependencies_to_add: [],
        risks: [],
        tokensUsed: totalTokensUsed
      };
    }

    // For planning mode, parse JSON
    let planData: any;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = finalResponse.match(/```json\n([\s\S]*?)\n```/) || finalResponse.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : finalResponse;
      planData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      logger.error('Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    const plan: Plan = {
      summary: planData.summary || '',
      steps: planData.steps || [],
      dependencies_to_add: planData.dependencies_to_add || [],
      risks: planData.risks || [],
      tokensUsed: totalTokensUsed
    };

    logger.success('Plan generated successfully');
    return plan;
  } catch (error) {
    logger.error('Error generating plan:', error);
    throw error;
  }
}
