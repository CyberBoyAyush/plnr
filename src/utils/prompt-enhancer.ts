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

    const systemPrompt = `You are a prompt enhancement assistant. Transform user prompts to be more specific, actionable, and effective.

CRITICAL RULES:
- Return ONLY the enhanced prompt text, NOTHING ELSE
- No explanations, no commentary, no additional text
- Do not add quotes around the prompt
- Just the enhanced prompt as plain text

Examples:
Input: add github auth
Output: How can I implement GitHub OAuth authentication in this codebase? Please analyze existing auth patterns, identify files that need changes, and provide a step-by-step implementation plan.

Input: how does auth work
Output: How does authentication currently work in this codebase? Please analyze auth-related files, explain the authentication flow, and identify the key components involved.`;

    // Simple API call without tools
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    let enhanced = completion.choices[0]?.message?.content?.trim();

    if (!enhanced) {
      logger.warn('No enhancement received, using original');
      return userInput;
    }

    // Extract only the first line if there are multiple lines (filter out commentary)
    const firstLine = enhanced.split('\n')[0].trim();

    // Remove quotes if present
    let cleaned = firstLine;
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    // If cleaned result is empty or too short, fall back to original input
    if (!cleaned || cleaned.length < 5) {
      logger.warn('Enhanced prompt was empty or too short, using original');
      return userInput;
    }

    logger.debug('Prompt enhanced successfully');
    return cleaned;
  } catch (error: any) {
    logger.error('Error enhancing prompt:', error.message || error);
    // On error, return original input
    return userInput;
  }
}
