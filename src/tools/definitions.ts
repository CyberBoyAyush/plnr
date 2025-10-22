import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read files from THIS PROJECT\'S codebase. Use this to examine implementation details, understand patterns, and see how features are currently built in the current project.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The relative path to the file from the project root (e.g., "src/index.ts", "package.json")'
          }
        },
        required: ['file_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for patterns in THIS PROJECT. Use this to find similar implementations, locate existing features, and understand the codebase structure before planning changes.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The text pattern or regex to search for'
          },
          file_pattern: {
            type: 'string',
            description: 'Optional glob pattern to filter which files to search (e.g., "*.ts", "src/**/*.js"). If not provided, searches all files.'
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Whether the search should be case sensitive. Default is false.'
          }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files in THIS PROJECT\'S directories. Use this to explore the current project structure and discover relevant files before reading them.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path or glob pattern to list (e.g., "src", "**/*.ts", "src/**/*.tsx")'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Execute safe shell commands like ls, pwd, find, or cat. Use this for basic file system operations. Commands like rm, mv, or write operations are not allowed.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The safe command to execute (only read-only commands allowed: ls, pwd, find, cat, grep, head, tail, wc)'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for CURRENT best practices, documentation, security advisories, and framework updates. Use this PROACTIVELY when: implementing features with dependencies, validating architectural decisions, checking for breaking changes, or researching latest patterns. Critical for Next.js/React/framework evolution and security best practices.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_code_context',
      description: 'Get production-quality code examples, API docs, and battle-tested patterns for ANY library/framework feature. Use BEFORE suggesting implementations for: authentication, database operations, API integrations, state management, payment processing, or ANY external library. Returns real-world patterns, common pitfalls, and current best practices.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The code or API you want to find examples for (e.g., "React useState", "Express middleware")'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_todos',
      description: 'Create a task list to track your progress on complex, multi-step queries. Use this at the START when the user asks complex questions that require multiple steps like: analyzing features, searching multiple files, understanding architecture, or generating plans. This shows the user what you\'re working on.',
      parameters: {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            description: 'Array of tasks you will perform',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique ID (use sequential numbers: "1", "2", "3")'
                },
                title: {
                  type: 'string',
                  description: 'Clear description of the task (e.g., "Search for auth patterns", "Read user model")'
                },
                status: {
                  type: 'string',
                  enum: ['pending'],
                  description: 'Always start with pending'
                }
              },
              required: ['id', 'title', 'status']
            }
          }
        },
        required: ['todos']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_todo',
      description: 'Update the status of a todo as you make progress. Call this IMMEDIATELY before starting a task (to mark in_progress) and right after completing it (to mark completed). This provides real-time progress updates to the user.',
      parameters: {
        type: 'object',
        properties: {
          todo_id: {
            type: 'string',
            description: 'ID of the todo to update'
          },
          status: {
            type: 'string',
            enum: ['in_progress', 'completed'],
            description: 'New status: in_progress when starting, completed when done'
          }
        },
        required: ['todo_id', 'status']
      }
    }
  }
];
