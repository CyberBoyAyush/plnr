import { CodebaseContext, Plan } from '../types/index.js';

export function buildPlanningPrompt(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true
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

  if (!isPlanning) {
    // Chat mode - conversational
    return `You are an expert software architect helping a developer with their project.

## Project Context
- **Language**: ${context.language}
- **Framework**: ${context.framework || 'Vanilla ' + context.language}
- **Dependencies**: ${dependencyList}

## Project Files
${filesContext}

${historyContext}

## User Question
${task}

## Your Task
Provide a helpful, conversational response to the user's question. Be concise but informative.

If they're asking about implementation:
- Give specific guidance
- Reference actual files in their project
- Suggest concrete next steps

Respond in JSON format:
{
  "summary": "Your conversational response (2-4 sentences)",
  "steps": [
    {
      "title": "Quick suggestion or next step",
      "description": "Brief explanation",
      "files_to_modify": [],
      "files_to_create": [],
      "code_changes": ""
    }
  ],
  "dependencies_to_add": [],
  "risks": []
}

**Output valid JSON only. No markdown, no explanations.**`;
  }

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
