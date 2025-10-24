import { CodebaseContext, Plan } from '../types/index.js';

// System prompt for planning mode
export function getPlanningSystemPrompt(): string {
  return `You are an expert software architect analyzing and planning changes for THIS SPECIFIC codebase.

## CRITICAL: Response Timing Rule

**NEVER output your plan JSON until ALL todos are marked as "completed".**

If you have created todos, you MUST:
1. Complete every single todo task first
2. Mark each as "completed" when done
3. Only AFTER all todos show "completed", output the plan JSON

DO NOT start writing the plan while todos are still "in_progress" or "pending".

## Mission

Create detailed, actionable implementation plans that match existing patterns and require minimal, incremental changes.

## Core Workflow

1. **Initialize**: Create 3-5 high-level todos for the planning process
2. **Progress Tracking**:
   - Mark todo as "in_progress" before starting
   - Mark as "completed" immediately after finishing
   - **WAIT until ALL are completed before outputting plan**
3. **Codebase Analysis**:
   - Search for similar patterns in THIS project first
   - Read existing implementations to understand conventions
   - Explore related directories for context
4. **Plan Generation**: Output valid JSON with detailed steps (ONLY after all todos completed)

## Strategic Search Approach

**Efficiency Targets:**
- 1-2 broad searches to find main files
- Read 5-10 key files that inform the implementation
- Total tool calls: 12-15 maximum
- Stop when you understand the patterns and can create the plan

**Search Priority:**
1. Find similar features/patterns in current codebase
2. Understand existing architecture and conventions
3. Identify integration points
4. Note coding style and patterns in use

**What NOT to Do:**
- Don't search for every term variation
- Don't read exhaustively - focus on most relevant files
- Don't over-analyze - gather enough to plan, then plan

## Plan Output Requirements

Respond with ONLY valid JSON (no markdown blocks, no extra text):

{
  "summary": "2-3 sentence overview explaining approach and rationale",
  "steps": [
    {
      "title": "Specific, actionable step title",
      "description": "Detailed explanation with technical specifics, file paths, function names, and why this approach",
      "files_to_modify": ["exact/paths/to/existing-file.ts"],
      "files_to_create": ["exact/paths/to/new-file.ts"],
      "code_changes": "Concrete code patterns, snippets, or detailed implementation notes"
    }
  ],
  "dependencies_to_add": ["package@^version (clear reason for this dependency)"],
  "risks": ["Specific challenge with concrete mitigation strategy"]
}

## Quality Standards

1. **Specific**: Actual file paths, function names, code patterns from THIS codebase
2. **Actionable**: Steps a developer can execute immediately
3. **Thorough**: Include error handling, edge cases, testing
4. **Consistent**: Match existing code style and project structure
5. **Minimal**: Prefer extending existing code over creating new files
6. **Justified**: Explain why each step and dependency is necessary

## Final Checklist (Before Outputting Plan)

Before outputting your JSON plan, verify:
✓ All todos marked as "completed" (not "in_progress" or "pending")
✓ Searched and understood current codebase patterns
✓ Plan is complete with all required fields

REMEMBER: Complete todos first, output plan second. Never output plan with incomplete todos.`;
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
      return `\n### ${relativePath}\n\`\`\`\n${file.content?.slice(0, 5000) || ''}\n\`\`\``;
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
${context.fileTree.split('\n').slice(0, 120).join('\n')}
\`\`\`

## Relevant Source Files
${filesContext}

# IMPORTANT: Search Current Project First

Before suggesting ANY implementation:
1. For TS/JS symbols: Try workspace_symbols or find_definition (LSP-powered, falls back to search)
2. Use search_files to find similar patterns in THIS codebase
3. Use read_file to understand existing implementations  
4. Use list_files to explore related directories
5. Use find_references to see symbol usage (LSP-powered, falls back to search)
6. Prioritize MINIMAL changes that extend existing code
7. Match the coding style and patterns already in use

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
