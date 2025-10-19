import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from './logger.js';

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/cyberboyayush/plnr',
    'X-Title': 'Plnr (Planner)'
  }
});

/**
 * Enhance a user prompt to be more specific, actionable, and effective
 * @param userInput - The original user input
 * @returns Enhanced prompt string
 */
export async function enhancePrompt(userInput: string): Promise<string> {
  try {
    // Don't enhance if input is empty or too short
    if (!userInput || userInput.trim().length < 3) {
      return userInput;
    }

    // Don't enhance if it's already a command
    if (userInput.trim().startsWith('/')) {
      return userInput;
    }

    logger.debug('Enhancing prompt...');

    const systemPrompt = `You are a prompt enhancement assistant. Transform user prompts to be more specific, actionable, and effective for codebase planning and analysis.

Guidelines:
- Make prompts clear and specific
- For vague requests, add context about analyzing existing patterns
- For implementation requests, suggest step-by-step planning
- For questions, make them more detailed and technical
- Keep the user's intent and tone
- Be concise but comprehensive
- Return ONLY the enhanced prompt, no explanations

Examples:
Input: "add github auth"
Output: "How can I implement GitHub OAuth authentication in this codebase? Please analyze existing auth patterns, identify files that need changes, and provide a step-by-step implementation plan."

Input: "how does auth work"
Output: "How does authentication currently work in this codebase? Please analyze auth-related files, explain the authentication flow, and identify the key components involved."

Input: "fix the bug in api"
Output: "Help me identify and fix bugs in the API endpoints. Please analyze the API code, check for common issues like error handling, validation, and security problems."`;

    // Simple API call without tools
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Enhance this prompt:\n\n"${userInput}"` }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const enhanced = completion.choices[0]?.message?.content?.trim();

    if (!enhanced) {
      logger.warn('No enhancement received, using original');
      return userInput;
    }

    // Remove quotes if AI wrapped the response
    let cleaned = enhanced;
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }

    logger.debug('Prompt enhanced successfully');
    return cleaned;
  } catch (error: any) {
    logger.error('Error enhancing prompt:', error.message || error);
    // On error, return original input
    return userInput;
  }
}
