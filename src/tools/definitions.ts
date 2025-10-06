import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the codebase. Use this to examine specific files that are relevant to the user\'s question or task.',
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
      description: 'Search for text patterns in files using grep. Use this to find where specific code, functions, or text appears in the codebase.',
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
      description: 'List files in a directory or matching a pattern. Use this to explore the project structure.',
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
      description: 'Search the web for current information, documentation, or answers. Use this when you need information not available in the codebase, or when user asks to search the web.',
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
      description: 'Search for code examples, API documentation, and library usage from the web. Use this when you need examples for specific APIs, libraries, or frameworks.',
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
  }
];
