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
      : 'You are an expert software architect and helpful coding assistant. Use the provided tools to explore the codebase and gather information to answer questions precisely. Reference specific files and code when relevant.';

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    // Tool calling loop
    const maxIterations = 10;
    let iteration = 0;
    let finalResponse: string | null = null;

    while (iteration < maxIterations) {
      iteration++;
      logger.debug(`Tool calling iteration ${iteration}/${maxIterations}`);

      const completion = await callOpenRouterWithTools(messages, tools);
      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error('No message in completion');
      }

      // Add assistant's message to conversation
      messages.push(message);

      // Check if we have tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(chalk.cyan(`\n🔧 Model using ${message.tool_calls.length} tool(s)...\n`));

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(chalk.gray(`  → ${toolName}(${JSON.stringify(args).substring(0, 60)}...)`));

          const result = await executeToolCall(toolName, args, context.projectRoot);

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.success ? (result.result || 'Success') : `Error: ${result.error}`
          });

          if (result.success) {
            console.log(chalk.gray(`  ✓ ${toolName} completed`));
          } else {
            console.log(chalk.yellow(`  ⚠ ${toolName} failed: ${result.error}`));
          }
        }

        console.log();
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

    // Try to extract JSON from response
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
      risks: planData.risks || []
    };

    logger.success('Plan generated successfully');
    return plan;
  } catch (error) {
    logger.error('Error generating plan:', error);
    throw error;
  }
}
