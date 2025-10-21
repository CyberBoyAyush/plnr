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
import { todoManager } from '../utils/todo-manager.js';
import { displayTodos } from '../cli/output.js';

export async function generatePlan(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true,
  sessionId: string = 'default',
  abortSignal?: AbortSignal
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
    const maxIterations = 50;
    let iteration = 0;
    let finalResponse: string | null = null;
    let totalTokensUsed = 0;
    let lastFinishReason = '';

    while (iteration < maxIterations) {
      iteration++;
      logger.debug(`Tool calling iteration ${iteration}/${maxIterations}`);

      // Use more tokens for chat mode to allow detailed responses
      const maxTokens = isPlanning ? 8000 : 16000;

      // CRITICAL: Only enable streaming when we're certain it's the final text response
      // Never stream when model might make tool calls (causes XML output bug with Grok)
      const enableStreaming = !isPlanning && lastFinishReason === 'stop' && iteration > 2;

      const completion = await callOpenRouterWithTools(messages, tools, config.model, maxTokens, enableStreaming, abortSignal);
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

      // Track finish reason for streaming decision
      lastFinishReason = completion.choices[0]?.finish_reason || '';

      // Add assistant's message to conversation
      messages.push(message);

      // CRITICAL FIX: Check if model output XML instead of proper tool calls (Grok bug)
      if (message.content && typeof message.content === 'string') {
        const hasXMLToolCall = message.content.includes('<xai:function_call') ||
                               message.content.includes('</xai:function_call>');

        if (hasXMLToolCall) {
          logger.warn('Model outputted XML format instead of tool calls. Requesting correction.');

          // Inject a correction message
          messages.push({
            role: 'user',
            content: `ERROR: You outputted XML format for tool calls. You must use the proper tool calling format provided by the API, not XML. Please redo your last response using the correct tool format.`
          });

          // Continue loop to get corrected response
          continue;
        }
      }

      // Check if we have tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          // Handle todo tools specially
          if (toolName === 'create_todos') {
            const result = await executeToolCall(toolName, args, context.projectRoot, sessionId);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result.success ? (result.result || 'Success') : `Error: ${result.error}`
            });
            
            if (result.success) {
              const todos = todoManager.getTodos(sessionId);
              displayTodos(todos);
            }
            continue;
          }
          
          if (toolName === 'update_todo') {
            const result = await executeToolCall(toolName, args, context.projectRoot, sessionId);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result.success ? (result.result || 'Success') : `Error: ${result.error}`
            });
            
            if (result.success) {
              const todos = todoManager.getTodos(sessionId);
              displayTodos(todos);
            }
            continue;
          }
          
          // Show minimal tool usage for other tools
          const displayArg = args.file_path || args.pattern || args.path || args.command || '';
          process.stdout.write(chalk.gray(`  ${toolName}(${displayArg}) `));
          const result = await executeToolCall(toolName, args, context.projectRoot, sessionId);
          
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

        // Soft warning when approaching limit
        const warningThreshold = Math.floor(maxIterations * 0.7); // Warn at 70% of max
        if (iteration >= warningThreshold && iteration % 5 === 0) {
          logger.warn(`Tool call iteration ${iteration}/${maxIterations}: Approaching limit`);

          // Check if todos are incomplete
          const todos = todoManager.getTodos(sessionId);
          const incompleteTodos = todos.filter(t => t.status !== 'completed');

          if (incompleteTodos.length > 0 && iteration >= warningThreshold + 5) {
            // Add warning message
            messages.push({
              role: 'user',
              content: `⚠️ You have made ${iteration} tool calls (max: ${maxIterations}). Please complete remaining todos and provide your final response soon.`
            });
          }
        }

        // Absolute hard stop at maxIterations - 5 (to allow for final response)
        if (iteration >= maxIterations - 5) {
          logger.warn(`Approaching hard limit at iteration ${iteration}/${maxIterations}. Requesting final response.`);
          messages.push({
            role: 'user',
            content: `STOP: You are approaching the maximum of ${maxIterations} tool calls. You must now provide your final response based on the information gathered. Complete any remaining todos and respond immediately.`
          });
        }

        // Smart pruning: Adjust based on model context window
        // Calculate dynamic retention based on context window size
        const contextWindow = config.modelContextWindow;
        let recentToKeep = 10;
        let pruneThreshold = 20;

        if (contextWindow >= 1500000) {
          // Huge context (1.5M+): Very generous, minimal pruning
          recentToKeep = 40;
          pruneThreshold = 80;
        } else if (contextWindow >= 500000) {
          // Large context (500K-1.5M): Moderate pruning
          recentToKeep = 25;
          pruneThreshold = 50;
        } else if (contextWindow >= 200000) {
          // Medium context (200K-500K): Standard pruning
          recentToKeep = 15;
          pruneThreshold = 30;
        } else if (contextWindow >= 100000) {
          // Small context (100K-200K): More aggressive
          recentToKeep = 10;
          pruneThreshold = 20;
        } else {
          // Very small context (<100K): Very aggressive pruning
          recentToKeep = 8;
          pruneThreshold = 15;
        }

        logger.debug(`Context window: ${contextWindow}, pruneThreshold: ${pruneThreshold}, recentToKeep: ${recentToKeep}`);

        if (messages.length > pruneThreshold) {
          const systemMsg = messages[0]; // Keep system prompt
          const userMsg = messages[1];   // Keep user task

          // CRITICAL: Adjust slice point to not break assistant+tool_results pairs
          // Find a safe slice point that doesn't split pairs
          let recentStartIdx = messages.length - recentToKeep;

          // If we're starting on a tool message, backtrack to find its assistant message
          while (recentStartIdx > 2 && messages[recentStartIdx].role === 'tool') {
            recentStartIdx--;
          }

          // If we're on an assistant with tool_calls, include it in recent (not middle)
          if (recentStartIdx > 2 &&
              messages[recentStartIdx].role === 'assistant' &&
              (messages[recentStartIdx] as any).tool_calls) {
            // This assistant is fine - it will have its tool results in recent
          } else if (recentStartIdx < messages.length - 1 &&
                     messages[recentStartIdx + 1].role === 'assistant' &&
                     (messages[recentStartIdx + 1] as any).tool_calls) {
            // Move back one more to include the assistant with tool_calls
            recentStartIdx--;
          }

          const recentMessages = messages.slice(recentStartIdx);
          const middleMessages = messages.slice(2, recentStartIdx);

          // CRITICAL: Maintain tool_call/tool_result pairing for Claude models
          // Process middle messages to keep complete assistant+tool_results pairs
          const filteredMiddle: ChatCompletionMessageParam[] = [];
          for (let i = 0; i < middleMessages.length; i++) {
            const msg = middleMessages[i];

            // If this is an assistant message with tool_calls
            if (msg.role === 'assistant' && (msg as any).tool_calls) {
              const toolCalls = (msg as any).tool_calls || [];
              const toolCallIds = new Set(toolCalls.map((tc: any) => tc.id));

              // Collect all corresponding tool results
              const toolResults: ChatCompletionMessageParam[] = [];
              let j = i + 1;
              while (j < middleMessages.length && middleMessages[j].role === 'tool') {
                const toolMsg = middleMessages[j];
                const toolCallId = (toolMsg as any).tool_call_id;
                if (toolCallIds.has(toolCallId)) {
                  toolResults.push(toolMsg);
                }
                j++;
              }

              // Only keep if we have ALL tool results
              if (toolResults.length === toolCalls.length) {
                // Check if worth keeping (not all failures)
                const hasOnlyFailures = toolResults.every(tr => {
                  const content = (tr as any).content || '';
                  return content.includes('File not found') ||
                         content.includes('No matches') ||
                         content.includes('failed') ||
                         content.includes('not allowed');
                });

                if (!hasOnlyFailures) {
                  filteredMiddle.push(msg);
                  filteredMiddle.push(...toolResults);
                }

                // Skip past the tool results we processed
                i = j - 1;
              } else {
                logger.debug(`Skipping assistant message with incomplete tool results`);
              }
            } else if (msg.role === 'tool') {
              // Skip standalone tool messages (already handled with assistant)
              continue;
            } else {
              // Keep other message types
              filteredMiddle.push(msg);
            }
          }

          // Final validation: ensure no orphaned tool messages at start of recent
          let validRecentStart = 0;
          while (validRecentStart < recentMessages.length &&
                 recentMessages[validRecentStart].role === 'tool') {
            logger.debug(`Removing orphaned tool result at start of recent messages`);
            validRecentStart++;
          }

          const validRecentMessages = recentMessages.slice(validRecentStart);

          messages.length = 0;
          messages.push(systemMsg, userMsg, ...filteredMiddle, ...validRecentMessages);
          logger.debug(`Pruned context (window: ${contextWindow}): maintained tool_call/tool_result pairing`);
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
  } catch (error: any) {
    // Handle abort error gracefully
    if (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('user aborted')) {
      throw new Error('Request cancelled by user');
    }
    logger.error('Error generating plan:', error);
    throw error;
  }
}
