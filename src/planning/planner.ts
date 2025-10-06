import { CodebaseContext, Plan } from '../types/index.js';
import { buildPlanningPrompt } from './prompt-builder.js';
import { callOpenRouter } from './openrouter.js';
import { logger } from '../utils/logger.js';

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

    const response = await callOpenRouter(prompt, isPlanning);

    // Try to extract JSON from response
    let planData: any;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
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
