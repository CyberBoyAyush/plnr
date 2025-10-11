import { CodebaseContext, Plan } from '../types/index.js';

// System prompt for planning mode
export function getPlanningSystemPrompt(): string {
  return 'You are an expert software architect. Use the provided tools to explore and analyze the codebase thoroughly. Search for relevant files, read code, and gather information before creating your implementation plan. Use web_search or get_code_context when you need current information, documentation, or examples not in the codebase. Be specific, thorough, and practical. Always respond with valid JSON only when providing the final plan.';
}

// User prompt for planning mode
export function buildPlanningPrompt(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = []
): string {
  const filesContext = context.relevantFiles
    .map(file => {
      const relativePath = file.path.replace(context.projectRoot + '/', '');
      return `\n### ${relativePath}\n\`\`\`\n${file.content?.slice(0, 1500) || ''}\n\`\`\``;
    })
    .join('\n');

  const dependencyList = context.dependencies.length > 0
    ? context.dependencies.slice(0, 15).join(', ')
    : 'None';

  // Build conversation history context
  const historyContext = conversationHistory.length > 0
    ? `\n## Previous Conversation\n\n${conversationHistory.map((item, i) =>
        `### Exchange ${i + 1}\n**User:** ${item.task}\n**Summary:** ${item.plan.summary}`
      ).join('\n\n')}\n`
    : '';

  // Planning mode - detailed implementation plan
  return `# Task
${task}
${historyContext}

# Codebase Analysis

## Technology Stack
- **Primary Language**: ${context.language}
- **Framework/Runtime**: ${context.framework || 'Vanilla ' + context.language}
- **Key Dependencies**: ${dependencyList}

## Project Structure (Key Directories)
\`\`\`
${context.fileTree.split('\n').slice(0, 60).join('\n')}
\`\`\`

## Relevant Source Files
${filesContext}

# Your Mission

As an expert software architect, analyze the above codebase and create a **detailed, actionable implementation plan** for the given task.

## Output Requirements

Respond with a JSON object following this exact structure:

\`\`\`json
{
  "summary": "2-3 sentence overview of the implementation approach and why this solution is appropriate",
  "steps": [
    {
      "title": "Clear, actionable step title",
      "description": "Detailed explanation of what needs to be done and why. Include specific technical details.",
      "files_to_modify": ["path/to/existing-file.ts"],
      "files_to_create": ["path/to/new-file.ts"],
      "code_changes": "Specific code changes or patterns to implement. Be as detailed as possible."
    }
  ],
  "dependencies_to_add": ["package-name@^version (reason for this dependency)"],
  "risks": ["Potential challenges or considerations with concrete mitigation strategies"]
}
\`\`\`

## Important Guidelines

1. **Be Specific**: Include actual file paths, function names, and code patterns
2. **Be Practical**: Steps should be actionable by a developer reading this plan
3. **Be Thorough**: Include error handling, edge cases, and testing considerations
4. **Maintain Consistency**: Match the existing code style and project structure
5. **Consider Dependencies**: Only suggest dependencies if truly necessary

**Output valid JSON only. No markdown code blocks, no explanations outside the JSON structure.**`;
}
