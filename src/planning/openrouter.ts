import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import chalk from 'chalk';

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/cyberboyayush/cengine',
    'X-Title': 'ContextEngine CLI'
  }
});

export async function callOpenRouter(
  prompt: string,
  model: string = 'x-ai/grok-code-fast-1'
): Promise<string> {
  const spinner = ora({
    text: `Calling AI model: ${chalk.cyan(model)}`,
    color: 'cyan'
  }).start();

  try {
    logger.debug(`Using model: ${model}`);
    spinner.text = `🤖 AI is analyzing your codebase...`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect. Analyze codebases and create detailed, actionable implementation plans. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      spinner.fail('No response from AI');
      throw new Error('No response from OpenRouter');
    }

    spinner.succeed(`AI analysis complete (${chalk.gray(model)})`);
    logger.debug('OpenRouter response received');
    return response;
  } catch (error: any) {
    spinner.fail('AI request failed');
    logger.error('OpenRouter API error:', error.message || error);
    throw error;
  }
}
