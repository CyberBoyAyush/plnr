import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { CodebaseContext, Plan } from '../types/index.js';
import { buildPlanningPrompt, getPlanningSystemPrompt } from './prompt-builder.js';
import { buildChatPrompt, getChatSystemPrompt } from '../chat/prompt-builder.js';
import { callOpenRouterWithTools } from './openrouter.js';
import { logger } from '../utils/logger.js';
import { tools } from '../tools/definitions.js';
import { executeToolCall } from '../tools/handlers.js';
import { config } from '../config.js';
import chalk from 'chalk';

export async function generatePlan(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true
): Promise<Plan> {
  try {
    logger.debug('Building prompt for AI...');

    const prompt = isPlanning
      ? buildPlanningPrompt(context, task, conversationHistory)
      : buildChatPrompt(context, task, conversationHistory);
    logger.debug(`Prompt size: ${prompt.length} characters`);

    // Build messages for tool calling
    const systemPrompt = isPlanning
      ? getPlanningSystemPrompt()
      : getChatSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
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
      // Enable streaming for chat mode (non-planning) on final response
      const enableStreaming = !isPlanning && iteration > 1;
      const completion = await callOpenRouterWithTools(messages, tools, config.model, maxTokens, enableStreaming);
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

        // Smart pruning: Adjust based on model context window
        // Calculate dynamic retention based on context window size
        const contextWindow = config.modelContextWindow;
        let recentToKeep = 10;
        let pruneThreshold = 20;

        if (contextWindow >= 2000000) {
          // Large context (2M+): Keep more, prune later
          recentToKeep = 15;
          pruneThreshold = 30;
        } else if (contextWindow >= 500000) {
          // Medium context (500K-2M): Standard pruning
          recentToKeep = 10;
          pruneThreshold = 20;
        } else {
          // Small context (<500K): Aggressive pruning
          recentToKeep = 8;
          pruneThreshold = 15;
        }

        if (messages.length > pruneThreshold) {
          const systemMsg = messages[0]; // Keep system prompt
          const userMsg = messages[1];   // Keep user task

          // Filter out failed tool calls from middle messages
          const recentMessages = messages.slice(-recentToKeep);
          const middleMessages = messages.slice(2, -recentToKeep);

          // Keep only successful tool results from middle
          const filteredMiddle = middleMessages.filter(msg => {
            if (msg.role !== 'tool') return true; // Keep non-tool messages
            const content = (msg as any).content || '';
            // Remove failed tool results
            return !content.includes('File not found') &&
                   !content.includes('No matches') &&
                   !content.includes('failed') &&
                   !content.includes('not allowed');
          });

          messages.length = 0;
          messages.push(systemMsg, userMsg, ...filteredMiddle, ...recentMessages);
          logger.debug(`Pruned context (window: ${contextWindow}): ${middleMessages.length - filteredMiddle.length} failed tool results removed`);
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
