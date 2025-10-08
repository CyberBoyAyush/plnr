# Low-Level Design Document - PLNR

> **A friendly, comprehensive guide to understanding the PLNR codebase from the ground up**

Hey there! 👋 Welcome to the PLNR low-level design documentation. This document is written for you to understand every single piece of this codebase - from how we use OpenRouter to how tools work, from the tech stack we chose to why certain decisions were made. Think of this as your complete handbook to answer any question about PLNR.

---

## Table of Contents

1. [What is PLNR?](#what-is-plnr)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Entry Point & Main Flow](#entry-point--main-flow)
5. [Configuration System](#configuration-system)
6. [Context Gathering System](#context-gathering-system)
7. [AI Planning System](#ai-planning-system)
8. [Tool Calling Implementation](#tool-calling-implementation)
9. [CLI & User Interface](#cli--user-interface)
10. [Export System](#export-system)
11. [Utilities](#utilities)
12. [Data Flow & Architecture](#data-flow--architecture)
13. [Deep Dive: How Everything Works Together](#deep-dive-how-everything-works-together)

---

## What is PLNR?

PLNR (Planner) is an AI-powered CLI tool that helps developers plan their implementation before writing code. It's like having an expert software architect sitting next to you, analyzing your codebase, understanding what you want to build, and creating detailed step-by-step implementation plans.

### Core Philosophy
- **Plan before implementation** - Think first, code later
- **Smart context gathering** - Only read what's needed
- **AI-guided exploration** - Let the AI decide what files to read
- **Seamless handoff** - Export plans and launch Claude Code or Codex CLI directly

### Key Features
1. **Codebase Analysis** - Understands project structure, frameworks, and dependencies
2. **Chat Mode** - Ask questions about your code
3. **Plan Mode** - Generate detailed implementation plans
4. **Tool Calling** - AI decides what files to read and operations to perform
5. **Web Search** - Integrated Exa search for documentation and examples
6. **Export** - Save plans as markdown PRDs
7. **Security Scanning** - Quick security audit of your codebase
8. **CLI Integrations** - Launch Claude Code or Codex with context

---

## Architecture Overview

PLNR follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface                            │
│  (User Input, Output Formatting, Interactive UI)            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Loop (index.tsx)                     │
│  • Command Routing                                           │
│  • Conversation History                                      │
│  • Mode Management (Chat/Plan)                               │
└─────────────────────────────┬───────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Context    │  │   Planning   │  │   Export     │
    │   System     │  │   System     │  │   System     │
    └──────┬───────┘  └───────┬──────┘  └──────────────┘
           │                  │
           │                  │
           │        ┌─────────┴──────────┐
           │        ▼                    ▼
           │  ┌──────────────┐    ┌──────────────┐
           └─▶│ Tool Calling │    │  OpenRouter  │
              │   System     │◀───│     API      │
              └──────────────┘    └──────────────┘
```

### Directory Structure

```
src/
├── cli/                 # User interface & terminal interactions
│   ├── interactive-input.ts   # Custom input with autocomplete
│   ├── output.ts              # Output formatting & display
│   └── ui.tsx                 # (Future React-based UI)
│
├── context/             # Codebase analysis & context gathering
│   ├── analyzer.ts            # Framework & language detection
│   ├── gatherer.ts            # Main context collection
│   └── reader.ts              # File reading utilities
│
├── planning/            # AI planning & OpenRouter integration
│   ├── openrouter.ts          # OpenRouter API client
│   ├── planner.ts             # Main planning logic & tool loop
│   └── prompt-builder.ts      # System prompts construction
│
├── tools/               # Tool calling system
│   ├── definitions.ts         # Tool schemas for OpenRouter
│   └── handlers.ts            # Tool execution implementations
│
├── exporters/           # Export functionality
│   └── prd-writer.ts          # PRD markdown generation
│
├── types/               # TypeScript type definitions
│   └── index.ts               # All interfaces & types
│
├── utils/               # Utility functions
│   ├── logger.ts              # Logging utilities
│   └── parse-mentions.ts      # @-mention parsing
│
├── config.ts            # Configuration & environment variables
└── index.tsx            # Main entry point & CLI setup
```

---

## Technology Stack

### Core Technologies

#### 1. **TypeScript**
- **Why?** Type safety, better IDE support, catches bugs early
- **Configuration**: `tsconfig.json` with ES modules (`type: "module"`)
- **Build**: Compiled to `dist/` using `tsc`

#### 2. **Node.js Runtime**
- **Minimum Version**: Node 18+ (for native fetch support)
- **Module System**: ES Modules (`.js` extensions in imports)
- **Environment**: Works on macOS, Linux, and Windows

#### 3. **Commander.js**
- **Purpose**: CLI framework for command-line parsing
- **Usage**: Handles command structure, help text, version display
- **Why?** Industry standard, simple, powerful

#### 4. **OpenRouter API**
- **Purpose**: Multi-model AI gateway
- **Base URL**: `https://openrouter.ai/api/v1`
- **Why?** Access to multiple models (Grok, Claude, GPT-4) via one API
- **Features**: Tool calling, streaming, large context windows

#### 5. **OpenAI SDK**
- **Version**: `^4.0.0`
- **Purpose**: Type-safe API client (works with OpenRouter)
- **Why?** Battle-tested, excellent TypeScript support, tool calling support

### UI Libraries

#### 1. **Chalk**
- **Purpose**: Terminal string styling (colors, bold, etc.)
- **Usage**: All output formatting, syntax highlighting
- **Why?** No dependencies, works everywhere, simple API

#### 2. **Marked + Marked-Terminal**
- **Purpose**: Markdown rendering in terminal
- **Usage**: Display AI responses with proper formatting
- **Why?** Beautiful output, code blocks, lists, headings

#### 3. **Ora**
- **Purpose**: Elegant terminal spinners
- **Usage**: Loading indicators during API calls
- **Why?** Professional UX, customizable, lightweight

#### 4. **Inquirer**
- **Purpose**: Interactive command-line user interfaces
- **Usage**: Prompts, confirmations (limited use currently)
- **Why?** Rich ecosystem, well-maintained

#### 5. **Custom Readline-based Input**
- **Implementation**: `src/cli/interactive-input.ts`
- **Features**: 
  - Tab completion for commands and files
  - @-mention autocomplete with fuzzy search
  - Mode switching (Chat/Plan)
  - Word-level editing (Alt+Backspace, Alt+Arrow)
  - Bordered input box with word wrapping
- **Why Custom?** Full control over UX, real-time suggestions, no library fits our needs

### Search & File Utilities

#### 1. **Glob**
- **Purpose**: File pattern matching
- **Usage**: Finding files by patterns, listing directories
- **Why?** Fast, cross-platform, flexible

#### 2. **Fuse.js**
- **Purpose**: Fuzzy file search
- **Usage**: @-mention autocomplete
- **Why?** Smart file matching, typo-tolerant

#### 3. **Fuzzysort**
- **Purpose**: Alternative fuzzy search (faster)
- **Usage**: Command completion
- **Why?** Extremely fast for small datasets

### Web Search Integration

#### 1. **Exa API** (Optional)
- **Base URL**: `https://api.exa.ai/`
- **Endpoints**:
  - `/search` - Web search for documentation
  - `/context` - Code examples and API docs
- **Usage**: AI calls `web_search` and `get_code_context` tools
- **Why?** High-quality results, code-focused, fast

---

## Entry Point & Main Flow

### File: `src/index.tsx`

This is where everything starts. Let's break it down step by step.

### 1. Initial Setup (Lines 1-28)

```typescript
#!/usr/bin/env node

// Suppress deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn(warning);
});
```

**What's happening?**
- Shebang (`#!/usr/bin/env node`) makes the file executable
- Deprecation warnings suppressed (cleaner output)
- Only real warnings shown to user

### 2. Imports & Configuration (Lines 10-28)

```typescript
import { Command } from 'commander';
import { validateConfig, config } from './config.js';
import { gatherContext } from './context/gatherer.js';
import { generatePlan } from './planning/planner.js';
// ... more imports

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const VERSION = packageJson.version;
```

**Why `createRequire`?**
- ES modules can't use `require()` directly
- Need to read `package.json` for version
- `createRequire` bridges CommonJS and ES modules

### 3. Command Definitions (Lines 33-42)

```typescript
const COMMANDS = [
  { name: '/plan', description: 'Generate an implementation plan' },
  { name: '/export', description: 'Export the current plan as markdown' },
  { name: '/cc', description: 'Start Claude Code with current context' },
  // ... more commands
];
```

**Purpose**: Autocomplete suggestions in the CLI

### 4. File Loading for Autocomplete (Lines 49-90)

```typescript
async function loadProjectFiles(projectRoot: string): Promise<void> {
  const patterns = [
    '*.{ts,js,tsx,jsx,json,md}',  // Root files first (fastest)
    'src/**/*',
    'lib/**/*',
    // ... more patterns
  ];
  
  const allFiles = new Set<string>();
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      nodir: true,
    });
    
    // Add to set for deduplication
    matches.forEach(f => allFiles.add(f));
    
    // Update cache progressively
    cachedFiles.length = 0;
    cachedFiles.push(...Array.from(allFiles));
    
    // Update Fuse instance for fuzzy search
    filesFuse = new Fuse(cachedFiles, { threshold: 0.3 });
  }
}
```

**Why progressive loading?**
- Fast autocomplete for common patterns (root files)
- Background loading for deeper directories
- User can start typing immediately

**Why Fuse.js?**
- Typo-tolerant search (`src/auth.ts` matches `src/aut`)
- Score-based ranking (better matches first)
- Fast enough for 1000+ files

### 5. Main Interactive Loop (Lines 124-709)

This is the heart of PLNR. Here's the flow:

```typescript
const mainLoop = async () => {
  while (true) {
    // 1. Get user input
    const result = await getInteractiveInput({
      prompt: chalk.bold.cyan('❯ '),
      commands: COMMANDS,
      files: cachedFiles,
      filesFuse,
      currentMode
    });
    
    const input = result.input;
    const mode = result.mode;
    
    // 2. Parse @-mentioned files
    const fileMatches = input.match(/@([\w\/.\\-]+)/g);
    const mentionedFiles = fileMatches ? fileMatches.map(m => m.substring(1)) : [];
    
    // 3. Handle commands or user input
    if (input === '/exit') { /* ... */ }
    else if (input.startsWith('/export')) { /* ... */ }
    else if (input.startsWith('/cc')) { /* ... */ }
    // ... more command handlers
    
    // 4. Default: Generate plan or chat response
    else {
      // Gather context if needed
      if (!context) {
        context = await gatherContext(projectRoot, input, mentionedFiles);
      }
      
      // Generate response based on mode
      if (mode === 'plan') {
        currentPlan = await generatePlan(context, input, conversationHistory, true);
        displayPlan(currentPlan);
      } else {
        const response = await generatePlan(context, input, conversationHistory, false);
        console.log(renderMarkdown(response.summary));
      }
      
      // Add to conversation history
      conversationHistory.push({ task: input, plan: response });
    }
  }
};
```

### Command Handlers

#### `/export` - Export Plan as Markdown

```typescript
if (input.startsWith('/export')) {
  if (!currentPlan || !currentTask) {
    displayError('No plan to export. Generate a plan first.');
    continue;
  }
  
  const filePath = await exportPRD(currentPlan, currentTask, projectRoot);
  displaySuccess(`Plan exported to: ${filePath}`);
}
```

**What happens?**
1. Checks if a plan exists
2. Calls `exportPRD()` to write markdown file
3. Saves to `.cengine/plan-<timestamp>.md`
4. Shows success message with file path

#### `/cc` - Launch Claude Code

```typescript
if (input.startsWith('/cc')) {
  // Generate plan first if needed
  if (!currentPlan) {
    displayInfo('No plan exists. Generating implementation plan first...');
    currentPlan = await generatePlan(context, taskForPlan, conversationHistory, true);
    displayPlan(currentPlan);
  }
  
  // Build context file
  const contextContent = `# plnr Analysis
  
## Project Overview
- **Language**: ${context.language}
- **Framework**: ${context.framework || 'None'}
- **Dependencies**: ${context.dependencies.slice(0, 15).join(', ')}

## Files Analyzed
${context.relevantFiles.map(f => `- \`${f.path}\``).join('\n')}

${currentPlan ? `## Implementation Plan\n\n${currentPlan.summary}\n\n### Steps\n...` : ''}
`;
  
  // Write context file
  const contextFilePath = path.join(projectRoot, '.contextengine-context.md');
  await fs.writeFile(contextFilePath, contextContent, 'utf-8');
  
  // Export PRD
  const prdFilePath = await exportPRD(currentPlan, currentTask, projectRoot);
  
  // Launch Claude Code in new terminal (platform-specific)
  if (platform === 'darwin') {
    // macOS
    spawn('osascript', [
      '-e',
      `tell application "Terminal" to do script "cd ${projectRoot} && claude @.contextengine-context.md"`
    ], { detached: true, stdio: 'ignore' }).unref();
  }
  // ... Windows and Linux versions
}
```

**Why separate terminal?**
- Claude Code needs its own interactive session
- PLNR can continue running
- User can switch between planning and coding

**Why `.contextengine-context.md`?**
- Claude Code reads context from markdown files
- Contains project overview, plan, and file references
- Format optimized for Claude's consumption

#### `/security-check` - Security Audit

```typescript
if (input === '/security-check') {
  displayInfo('Running security scan...');
  
  // Minimal context - no file contents
  const minimalContext: CodebaseContext = {
    projectRoot,
    language: context?.language || 'unknown',
    framework: context?.framework || 'unknown',
    dependencies: context?.dependencies || [],
    relevantFiles: [],
    fileTree: ''
  };
  
  // Ultra-short security prompt
  const securityPrompt = `Security scan - CRITICAL issues only:

1. Hardcoded secrets (search: API_KEY, SECRET, PASSWORD, TOKEN)
2. Auth issues
3. SQL/XSS injection
4. Insecure endpoints

SKIP: .env files (already secure)
Max 10-15 tool calls. Search first, read only suspicious files.
Output: file:line, issue, risk, fix.`;
  
  const securityReport = await generatePlan(minimalContext, securityPrompt, [], false);
  
  // Parse and format findings
  const findings = securityReport.summary.split(/\n(?=\.\/)/);
  findings.forEach(finding => {
    // Display with color-coded risk levels
  });
}
```

**Why minimal context?**
- Security scan doesn't need all files loaded
- AI uses tools to search for specific patterns
- Faster, cheaper (fewer tokens)

**How it works?**
1. AI uses `search_files` tool to find suspicious patterns
2. Reads only files that match security keywords
3. Analyzes for hardcoded secrets, vulnerabilities
4. Returns formatted report with file:line references

#### `/clear` - Clear Conversation

```typescript
if (input === '/clear') {
  console.clear();
  displayWelcome(VERSION, config.model);
  
  // Reset state
  currentPlan = null;
  currentTask = null;
  context = null;
  conversationHistory = [];
  
  displaySuccess('Conversation cleared!');
}
```

**State reset**: 
- Clears terminal
- Resets all in-memory data
- Fresh start for new planning session

---

## Configuration System

### File: `src/config.ts`

This file handles all environment variables and configuration.

```typescript
import dotenv from 'dotenv';
import { Config } from './types/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from current directory (where user runs the command)
dotenv.config();

// Also try to load from the tool's installation directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolRoot = join(__dirname, '..');
dotenv.config({ path: join(toolRoot, '.env') });

export const config: Config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  exaApiKey: process.env.EXA_API_KEY || '',
  model: process.env.MODEL || 'x-ai/grok-code-fast-1',
  modelContextWindow: parseInt(process.env.MODEL_CONTEXT_WINDOW || '256000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
};

export function validateConfig(): void {
  if (!config.openRouterApiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is required. Please set it as an environment variable:\n' +
      '  export OPENROUTER_API_KEY=sk-or-v1-xxxxx\n' +
      'Or add it to a .env file in the current directory.'
    );
  }
}
```

### Configuration Loading Strategy

**Two-level loading**:
1. **User directory**: `.env` in current working directory
2. **Tool directory**: `.env` in PLNR installation folder

**Why?**
- User can have project-specific configs
- Global installation can have default config
- User config overrides global config

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENROUTER_API_KEY` | ✅ Yes | - | OpenRouter authentication |
| `EXA_API_KEY` | ❌ No | - | Exa search (optional) |
| `MODEL` | ❌ No | `x-ai/grok-code-fast-1` | AI model selection |
| `MODEL_CONTEXT_WINDOW` | ❌ No | `256000` | Model's context size |
| `NODE_ENV` | ❌ No | `development` | Environment mode |
| `DEBUG` | ❌ No | `false` | Debug logging |

### Model Context Window

**Why important?**
- Controls how much code can be in context
- Affects token pruning strategy (lines 122-163 in `planner.ts`)
- Different models have different limits:
  - Grok Code Fast: 256K tokens
  - Grok 4 Fast: 2M tokens
  - Claude Sonnet 4.5: 200K tokens
  - GPT-4: 128K tokens

**Dynamic pruning** (in `planner.ts`):
```typescript
const contextWindow = config.modelContextWindow;
let recentToKeep = 10;
let pruneThreshold = 20;

if (contextWindow >= 2000000) {
  // Large context (2M+): Keep more, prune later
  recentToKeep = 15;
  pruneThreshold = 30;
} else if (contextWindow >= 500000) {
  // Medium context (500K-2M): Standard pruning
  recentToKeep = 10;
  pruneThreshold = 20;
} else {
  // Small context (<500K): Aggressive pruning
  recentToKeep = 8;
  pruneThreshold = 15;
}
```

---

## Context Gathering System

The context system analyzes the codebase to provide relevant information to the AI.

### File: `src/context/gatherer.ts`

```typescript
export async function gatherContext(
  projectRoot: string,
  _task: string,
  mentionedFiles: string[] = []
): Promise<CodebaseContext> {
  console.log(chalk.bold.cyan('\n🔍 Analyzing Codebase\n'));

  // 1. Read project structure
  const fileTree = await readProjectStructure(projectRoot);
  
  // 2. Read package.json
  const packageJson = await readPackageJson(projectRoot);

  // 3. Extract dependencies
  const dependencies = packageJson
    ? Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
    : [];

  // 4. Detect framework
  const framework = detectFramework(
    packageJson ? { ...packageJson.dependencies, ...packageJson.devDependencies } : {}
  );

  // 5. Detect language
  const language = detectLanguage(fileTree);

  // Display detected info
  console.log(chalk.blue('📦 Detected:'));
  console.log(chalk.gray(`  Language: ${language}`));
  console.log(chalk.gray(`  Framework: ${framework || 'None'}`));
  console.log(chalk.gray(`  Dependencies: ${dependencies.length} packages`));

  // 6. Read only @-mentioned files upfront
  const relevantFiles: FileInfo[] = [];
  if (mentionedFiles.length > 0) {
    console.log(chalk.blue(`\n📎 Reading ${mentionedFiles.length} mentioned file(s)...\n`));
    for (const filePath of mentionedFiles) {
      try {
        const absolutePath = join(projectRoot, filePath);
        const content = await readFile(absolutePath, 'utf-8');
        const stats = await import('fs/promises').then(fs => fs.stat(absolutePath));
        relevantFiles.push({
          path: filePath,
          content,
          size: stats.size
        });
        console.log(chalk.gray(`  ✓ ${filePath}`));
      } catch (error) {
        logger.error(`Failed to read mentioned file ${filePath}:`, error);
      }
    }
  }

  return {
    projectRoot,
    framework,
    language,
    dependencies,
    fileTree,
    relevantFiles
  };
}
```

### What Gets Gathered?

#### 1. File Tree (`readProjectStructure`)

```typescript
export async function readProjectStructure(rootPath: string): Promise<string> {
  const files = await glob('**/*', {
    cwd: rootPath,
    ignore: ['node_modules/**', 'dist/**', '.git/**', '*.log'],
    nodir: true,
    maxDepth: 3
  });
  
  return files.join('\n');
}
```

**Why maxDepth: 3?**
- Most relevant files are in top 3 levels
- Prevents massive file lists
- Faster scanning

**Ignored patterns:**
- `node_modules/**` - Dependencies (too large)
- `dist/**`, `build/**` - Build outputs
- `.git/**` - Git internals
- `*.log` - Log files

#### 2. Package.json Reading

```typescript
export async function readPackageJson(rootPath: string): Promise<any> {
  try {
    const packagePath = `${rootPath}/package.json`;
    const content = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.warn('No package.json found');
    return null;
  }
}
```

**What we extract:**
- Dependencies list (for AI context)
- Framework detection hints
- Project metadata

#### 3. Framework Detection (`src/context/analyzer.ts`)

```typescript
const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'Next.js': ['next', 'next.config'],
  'Express': ['express'],
  'React': ['react', 'react-dom'],
  'Vue': ['vue'],
  'Angular': ['@angular/core'],
  'NestJS': ['@nestjs/core'],
  'Fastify': ['fastify'],
  'Koa': ['koa']
};

export function detectFramework(dependencies: Record<string, string> = {}): string | undefined {
  const allDeps = Object.keys(dependencies);

  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    if (indicators.some(indicator => allDeps.includes(indicator))) {
      return framework;
    }
  }

  return undefined;
}
```

**Why framework matters?**
- AI provides framework-specific suggestions
- Knows architectural patterns (Next.js app router, Express middleware, etc.)
- Better code generation

#### 4. Language Detection

```typescript
export function detectLanguage(fileTree: string): string {
  if (fileTree.includes('.ts') || fileTree.includes('.tsx')) {
    return 'TypeScript';
  }
  if (fileTree.includes('.js') || fileTree.includes('.jsx')) {
    return 'JavaScript';
  }
  if (fileTree.includes('.py')) {
    return 'Python';
  }
  if (fileTree.includes('.go')) {
    return 'Go';
  }
  if (fileTree.includes('.rs')) {
    return 'Rust';
  }
  return 'Unknown';
}
```

**Simple but effective**: Checks file extensions in the file tree string

### CodebaseContext Type

```typescript
export interface CodebaseContext {
  projectRoot: string;        // Absolute path
  framework?: string;          // Detected framework (Next.js, Express, etc.)
  language: string;            // TypeScript, JavaScript, Python, etc.
  dependencies: string[];      // List of npm/pip/cargo packages
  fileTree: string;            // Newline-separated file paths
  relevantFiles: FileInfo[];   // @-mentioned files (loaded upfront)
}

export interface FileInfo {
  path: string;                // Relative path from projectRoot
  content?: string;            // File contents
  size: number;                // File size in bytes
}
```

### Key Design Decision: Minimal Upfront Loading

**Old approach** (pre-tool-calling):
- Load 10-15 "relevant" files based on heuristics
- Send all file contents to AI
- Wasteful: AI often doesn't need most files

**New approach** (with tool calling):
- Load ONLY @-mentioned files
- Provide file tree, dependencies, framework
- Let AI request more files via `read_file` tool
- Result: 50-70% fewer tokens used

---

## AI Planning System

This is where the magic happens. The planning system orchestrates AI interactions, tool calling, and response generation.

### File: `src/planning/planner.ts`

The main function is `generatePlan()`. Let's break it down.

### Function Signature

```typescript
export async function generatePlan(
  context: CodebaseContext,      // Project context
  task: string,                   // User's query/task
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true      // Plan mode vs Chat mode
): Promise<Plan>
```

### Step 1: Build System Prompt (Lines 24-56)

**For Planning Mode:**
```typescript
const systemPrompt = 'You are an expert software architect. Use the provided tools to explore and analyze the codebase thoroughly. Search for relevant files, read code, and gather information before creating your implementation plan. Use web_search or get_code_context when you need current information, documentation, or examples not in the codebase. Be specific, thorough, and practical. Always respond with valid JSON only when providing the final plan.'
```

**For Chat Mode:**
```typescript
const systemPrompt = `You are an expert software architect and helpful coding assistant.

INSTRUCTIONS:
1. Use tools EFFICIENTLY to find information:
   - Start with search_files to locate relevant files
   - Use read_file only on the most relevant files
   - Use web_search when user asks to search the web
   - Use get_code_context for API docs, library examples
   - Avoid redundant tool calls (ls, execute_command for basic listing)
   - Focus on files that directly answer the question

2. After gathering information (typically 2-4 tool calls), provide a DETAILED response:
   - List specific details from actual code you read
   - Include function names, variable names, file paths
   - Show code snippets when relevant
   - Provide complete lists
   - Reference actual code content, not generic descriptions

3. Format using markdown:
   - Use bullet points for lists
   - Use code blocks for code examples
   - Use headers for sections
   - NEVER use tables (they don't render properly in terminal)

IMPORTANT:
- Do NOT waste tool calls on basic directory listing
- Use search_files to find files, then read_file to get content
- Respond in natural language (NOT JSON) after gathering info
- Be thorough but efficient with tool usage
- NO TABLES in responses - use lists instead`;
```

**Why different prompts?**
- **Planning**: Needs structured JSON output with steps, dependencies, risks
- **Chat**: Needs conversational markdown response
- Both use tools, but output format differs

### Step 2: Build Message Array (Lines 58-61)

```typescript
const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: isPlanning ? prompt : task }
];
```

**Message format** (OpenAI chat completion format):
- `system`: Instructions for the AI
- `user`: The actual query/task
- `assistant`: AI's response
- `tool`: Tool execution results

### Step 3: Tool Calling Loop (Lines 64-176)

This is the heart of the planning system. It implements an iterative loop where the AI decides what tools to call, we execute them, and send results back.

```typescript
const maxIterations = 25;
let iteration = 0;
let finalResponse: string | null = null;
let totalTokensUsed = 0;

while (iteration < maxIterations) {
  iteration++;
  
  // Call OpenRouter with tools
  const maxTokens = isPlanning ? 4000 : 8000;
  const enableStreaming = !isPlanning && iteration > 1;
  const completion = await callOpenRouterWithTools(
    messages, 
    tools, 
    config.model, 
    maxTokens, 
    enableStreaming
  );
  
  const message = completion.choices[0]?.message;
  
  // Track token usage
  if (completion.usage) {
    totalTokensUsed += completion.usage.total_tokens || 0;
    const tokensInK = (totalTokensUsed / 1000).toFixed(1);
    process.stdout.write(`\r${chalk.dim(`  Tokens: ${tokensInK}k`)}`);
  }
  
  // Add assistant's message to conversation
  messages.push(message);
  
  // Check if we have tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      // Show minimal tool usage
      const displayArg = args.file_path || args.pattern || args.path || args.command || '';
      process.stdout.write(chalk.gray(`  ${toolName}(${displayArg}) `));
      
      // Execute the tool
      const result = await executeToolCall(toolName, args, context.projectRoot);
      
      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result.success ? (result.result || 'Success') : `Error: ${result.error}`
      });
      
      if (result.success) {
        console.log(chalk.green('✓'));
      } else {
        console.log(chalk.red('✗'));
      }
    }
    
    // Smart pruning (see below)
    if (messages.length > pruneThreshold) {
      // ... pruning logic
    }
  } else {
    // No more tool calls, we have the final response
    finalResponse = message.content || '';
    break;
  }
}
```

**What's happening?**
1. **Iteration**: Loop up to 25 times (safety limit)
2. **API Call**: Send messages + tools to OpenRouter
3. **Token Tracking**: Display live token counter
4. **Tool Calls**: If AI calls tools, execute them
5. **Tool Results**: Add results back to messages
6. **Repeat**: Until AI stops calling tools
7. **Final Response**: When AI returns text instead of tool calls

**Why 25 iterations?**
- Most tasks complete in 5-10 iterations
- Complex codebases might need 15-20
- 25 is safety limit to prevent infinite loops

### Step 4: Smart Context Pruning (Lines 122-163)

To prevent context overflow, we prune old tool results while keeping recent ones:

```typescript
// Calculate dynamic retention based on context window size
const contextWindow = config.modelContextWindow;
let recentToKeep = 10;
let pruneThreshold = 20;

if (contextWindow >= 2000000) {
  recentToKeep = 15;
  pruneThreshold = 30;
} else if (contextWindow >= 500000) {
  recentToKeep = 10;
  pruneThreshold = 20;
} else {
  recentToKeep = 8;
  pruneThreshold = 15;
}

if (messages.length > pruneThreshold) {
  const systemMsg = messages[0]; // Keep system prompt
  const userMsg = messages[1];   // Keep user task

  const recentMessages = messages.slice(-recentToKeep);
  const middleMessages = messages.slice(2, -recentToKeep);

  // Keep only successful tool results from middle
  const filteredMiddle = middleMessages.filter(msg => {
    if (msg.role !== 'tool') return true; // Keep non-tool messages
    const content = (msg as any).content || '';
    // Remove failed tool results
    return !content.includes('File not found') &&
           !content.includes('No matches') &&
           !content.includes('failed') &&
           !content.includes('not allowed');
  });

  messages.length = 0;
  messages.push(systemMsg, userMsg, ...filteredMiddle, ...recentMessages);
}
```

**Pruning strategy:**
1. **Always keep**: System prompt, user task, recent messages
2. **Filter middle**: Remove failed tool calls (404s, errors)
3. **Dynamic thresholds**: Larger context = keep more messages
4. **Result**: Saves 30-50% tokens on long conversations

### Step 5: Parse Response (Lines 178-216)

**For Chat Mode:**
```typescript
if (!isPlanning) {
  return {
    summary: finalResponse,  // Raw markdown text
    steps: [],
    dependencies_to_add: [],
    risks: [],
    tokensUsed: totalTokensUsed
  };
}
```

**For Planning Mode:**
```typescript
let planData: any;
try {
  // Remove markdown code blocks if present
  const jsonMatch = finalResponse.match(/```json\n([\s\S]*?)\n```/) 
                 || finalResponse.match(/```\n([\s\S]*?)\n```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : finalResponse;
  planData = JSON.parse(jsonStr.trim());
} catch (parseError) {
  throw new Error('Invalid JSON response from AI');
}

const plan: Plan = {
  summary: planData.summary || '',
  steps: planData.steps || [],
  dependencies_to_add: planData.dependencies_to_add || [],
  risks: planData.risks || [],
  tokensUsed: totalTokensUsed
};
```

**Why regex extraction?**
- AI sometimes wraps JSON in markdown code blocks
- Need to extract pure JSON for parsing
- Fallback: Try parsing raw response if no code blocks

---

## Tool Calling Implementation

Tool calling is what makes PLNR smart and efficient. Instead of loading all files upfront, the AI decides what it needs.

### File: `src/tools/definitions.ts`

This file defines the tools available to the AI in OpenRouter's tool calling format.

```typescript
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
  // ... more tools
];
```

### Tool 1: `read_file`

**Purpose**: Read contents of a specific file

**Parameters:**
- `file_path` (string, required): Relative path from project root

**Example usage by AI:**
```json
{
  "name": "read_file",
  "arguments": {
    "file_path": "src/auth/login.ts"
  }
}
```

**Implementation** (`src/tools/handlers.ts`):
```typescript
export async function handleReadFile(filePath: string, projectRoot: string): Promise<ToolCallResult> {
  try {
    const absolutePath = join(projectRoot, filePath);
    const content = await readFile(absolutePath, 'utf-8');

    // Limit content size to 20KB
    const maxSize = 20000;
    const truncated = content.length > maxSize;
    const result = truncated ? content.substring(0, maxSize) + '\n\n[...truncated]' : content;

    return {
      success: true,
      result
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'File not found'
    };
  }
}
```

**Why 20KB limit?**
- Prevents single file from consuming too many tokens
- Most files are < 20KB
- Truncated notice tells AI to ask for specific sections

### Tool 2: `search_files`

**Purpose**: Search for text patterns in files (grep-like)

**Parameters:**
- `pattern` (string, required): Text or regex to search
- `file_pattern` (string, optional): Glob pattern for file filtering
- `case_sensitive` (boolean, optional): Case sensitivity

**Example usage by AI:**
```json
{
  "name": "search_files",
  "arguments": {
    "pattern": "authentication",
    "file_pattern": "*.ts"
  }
}
```

**Implementation:**
```typescript
export async function handleSearchFiles(
  pattern: string,
  projectRoot: string,
  filePattern?: string,
  caseSensitive: boolean = false
): Promise<ToolCallResult> {
  const caseFlag = caseSensitive ? '' : '-i';
  const includeFlag = filePattern ? `--include="${filePattern}"` : '';

  const excludeDirs = [
    'node_modules',
    'dist',
    'build',
    '.next',
    '.git',
    'coverage'
  ].map(dir => `--exclude-dir=${dir}`).join(' ');

  // Use grep with exclusions, limit to 10 results
  const command = `grep -r ${caseFlag} ${includeFlag} ${excludeDirs} -n "${pattern}" . 2>/dev/null | head -n 10`;

  const { stdout } = await execAsync(command, { cwd: projectRoot });

  const result = stdout.trim() || 'No matches found';
  const lines = result.split('\n');
  const limitedResult = lines.length > 10 ? lines.slice(0, 10).join('\n') + '\n[...more]' : result;

  return {
    success: true,
    result: `Search results for "${pattern}":\n\n${limitedResult}`
  };
}
```

**Why grep instead of JavaScript search?**
- Grep is extremely fast (native C implementation)
- Supports regex, case-insensitive, file patterns
- Available on all Unix systems

**Why limit to 10 results?**
- Common patterns might match hundreds of times
- AI only needs representative samples
- Saves tokens

### Tool 3: `list_files`

**Purpose**: List files matching a pattern

**Parameters:**
- `path` (string, required): Directory or glob pattern

**Example usage by AI:**
```json
{
  "name": "list_files",
  "arguments": {
    "path": "src/**/*.ts"
  }
}
```

**Implementation:**
```typescript
export async function handleListFiles(path: string, projectRoot: string): Promise<ToolCallResult> {
  const files = await glob(path, {
    cwd: projectRoot,
    ignore: ['node_modules/**', '.git/**', 'dist/**'],
    absolute: false
  });

  // Limit results to 50
  const limited = files.slice(0, 50);
  const truncated = files.length > 50;

  const result = limited.join('\n') + (truncated ? `\n[...${files.length - 50} more]` : '');

  return {
    success: true,
    result: result || 'No files found'
  };
}
```

### Tool 4: `execute_command`

**Purpose**: Execute safe read-only shell commands

**Parameters:**
- `command` (string, required): Shell command to execute

**Whitelist:**
```typescript
const SAFE_COMMANDS = ['ls', 'pwd', 'find', 'cat', 'grep', 'head', 'tail', 'wc', 'file', 'stat'];
```

**Example usage by AI:**
```json
{
  "name": "execute_command",
  "arguments": {
    "command": "find src -name '*.test.ts'"
  }
}
```

**Implementation:**
```typescript
export async function handleExecuteCommand(command: string, projectRoot: string): Promise<ToolCallResult> {
  const baseCommand = command.trim().split(' ')[0];

  // Check whitelist
  if (!SAFE_COMMANDS.includes(baseCommand)) {
    return {
      success: false,
      error: 'Command not allowed'
    };
  }

  const { stdout, stderr } = await execAsync(command, {
    cwd: projectRoot,
    maxBuffer: 1024 * 1024 * 5, // 5MB
    timeout: 30000 // 30s
  });

  // Limit output to 20KB
  const output = stdout.trim() || stderr.trim() || 'No output';
  const maxOutputSize = 20000;
  const result = output.length > maxOutputSize
    ? output.substring(0, maxOutputSize) + '\n[...truncated]'
    : output;

  return {
    success: true,
    result
  };
}
```

**Security:**
- Only whitelisted commands allowed
- No write operations (rm, mv, cp, etc.)
- Timeout prevents hanging
- Buffer limit prevents memory issues

### Tool 5: `web_search`

**Purpose**: Search the web for information (uses Exa API)

**Parameters:**
- `query` (string, required): Search query

**Example usage by AI:**
```json
{
  "name": "web_search",
  "arguments": {
    "query": "Next.js 14 server actions example"
  }
}
```

**Implementation:**
```typescript
export async function handleWebSearch(query: string): Promise<ToolCallResult> {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.exaApiKey
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      contents: { text: { maxCharacters: 1000 } }
    })
  });

  const data: any = await response.json();
  const results = data.results?.slice(0, 5).map((r: any) =>
    `${r.title}\n${r.url}\n${r.text || ''}`
  ).join('\n\n') || 'No results';

  return { success: true, result: results };
}
```

**When AI uses this:**
- User asks about new features not in codebase
- Needs documentation for libraries
- Looking for examples or best practices

### Tool 6: `get_code_context`

**Purpose**: Get code examples and API documentation (uses Exa API)

**Parameters:**
- `query` (string, required): Code/API to find examples for

**Example usage by AI:**
```json
{
  "name": "get_code_context",
  "arguments": {
    "query": "React useState hook example"
  }
}
```

**Implementation:**
```typescript
export async function handleGetCodeContext(query: string): Promise<ToolCallResult> {
  const response = await fetch('https://api.exa.ai/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.exaApiKey
    },
    body: JSON.stringify({ query })
  });

  const data: any = await response.json();
  return { success: true, result: data.context || 'No context found' };
}
```

**Difference from web_search:**
- Focused on code examples
- Returns structured API documentation
- Better for "how to use X library"

### Tool Execution Dispatcher

All tools go through this central dispatcher:

```typescript
export async function executeToolCall(
  toolName: string,
  args: any,
  projectRoot: string
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'read_file':
      return handleReadFile(args.file_path, projectRoot);

    case 'search_files':
      return handleSearchFiles(
        args.pattern,
        projectRoot,
        args.file_pattern,
        args.case_sensitive
      );

    case 'list_files':
      return handleListFiles(args.path, projectRoot);

    case 'execute_command':
      return handleExecuteCommand(args.command, projectRoot);

    case 'web_search':
      return handleWebSearch(args.query);

    case 'get_code_context':
      return handleGetCodeContext(args.query);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}
```

### Tool Call Flow Example

**User asks:** "How does authentication work?"

**AI's thought process (via tool calls):**
1. `search_files("authentication")` → Finds files mentioning auth
2. `read_file("src/auth/login.ts")` → Reads login file
3. `read_file("src/middleware/auth.ts")` → Reads auth middleware
4. Analyzes both files
5. Returns answer with code references

**Output to user:**
```
Authentication works through JWT tokens:

1. Login flow (src/auth/login.ts):
   - User submits credentials
   - Server validates against database
   - Issues JWT token

2. Protected routes (src/middleware/auth.ts):
   - Middleware extracts token from headers
   - Verifies JWT signature
   - Adds user data to request
```

---

## OpenRouter Integration

### File: `src/planning/openrouter.ts`

This file handles all communication with OpenRouter's API.

### OpenAI SDK Setup

```typescript
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/cyberboyayush/plnr',
    'X-Title': 'Plnr (Planner)'
  }
});
```

**Why OpenAI SDK with OpenRouter?**
- OpenRouter is API-compatible with OpenAI
- Excellent TypeScript support
- Built-in tool calling support
- Stream support

**Headers:**
- `HTTP-Referer`: Tracks where requests come from (OpenRouter analytics)
- `X-Title`: App name displayed in OpenRouter dashboard

### Non-Streaming Tool Calls (Lines 99-122)

```typescript
export async function callOpenRouterWithTools(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  model: string = config.model,
  maxTokens: number = 4000,
  streaming: boolean = false
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  
  if (!streaming) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',  // Let AI decide when to use tools
      temperature: 0.7,     // Balance creativity and consistency
      max_tokens: maxTokens
    });

    return completion;
  }
  
  // ... streaming mode (see below)
}
```

**Parameters explained:**
- `messages`: Conversation history (system, user, assistant, tool)
- `tools`: Available tools definitions
- `tool_choice: 'auto'`: AI decides if/when to call tools
- `temperature: 0.7`: Higher = creative, lower = deterministic
- `max_tokens`: Maximum response length

**Return value:**
```typescript
{
  id: 'chatcmpl-...',
  choices: [{
    message: {
      role: 'assistant',
      content: '...' or null,
      tool_calls: [{ id, function: { name, arguments } }] or undefined
    },
    finish_reason: 'stop' | 'tool_calls' | 'length'
  }],
  usage: {
    prompt_tokens: 1234,
    completion_tokens: 567,
    total_tokens: 1801
  }
}
```

**Finish reasons:**
- `stop`: AI finished its response (no more tool calls)
- `tool_calls`: AI wants to call tools
- `length`: Hit max_tokens limit (rare, increase maxTokens if this happens)

### Streaming Mode (Lines 124-214)

For chat responses, we use streaming to show progress:

```typescript
if (streaming) {
  const spinner = ora({
    text: chalk.white('Generating response...'),
    color: 'white'
  }).start();

  const stream = await openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true  // Enable streaming
  });

  let fullContent = '';
  let fullToolCalls: any[] = [];
  let tokenCount = 0;

  // Process stream chunks
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    // Accumulate content
    if (delta?.content) {
      fullContent += delta.content;
      tokenCount = Math.floor(fullContent.length / 4); // Rough estimate
      spinner.text = chalk.white(`Generating response... `) + chalk.dim(`(~${tokenCount} tokens)`);
    }

    // Accumulate tool calls
    if (delta?.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;
        if (!fullToolCalls[index]) {
          fullToolCalls[index] = {
            id: toolCall.id || '',
            type: 'function',
            function: { name: '', arguments: '' }
          };
        }
        if (toolCall.function?.name) {
          fullToolCalls[index].function.name = toolCall.function.name;
        }
        if (toolCall.function?.arguments) {
          fullToolCalls[index].function.arguments += toolCall.function.arguments;
        }
      }
    }
  }

  spinner.stop();

  // Construct ChatCompletion-like response
  return {
    id: 'streamed-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: fullContent || null,
        tool_calls: fullToolCalls.length > 0 ? fullToolCalls : undefined,
        refusal: null
      },
      logprobs: null,
      finish_reason: finishReason as any
    }],
    usage: undefined
  };
}
```

**Why streaming?**
- Shows progress (not just frozen spinner)
- Better UX for long responses
- User sees partial results faster

**Why only in chat mode?**
- Planning mode needs complete JSON (can't parse partial)
- Tool calls come through streaming anyway
- Chat responses can be shown incrementally

---

## CLI & User Interface

The CLI is what users interact with. It needs to be intuitive, responsive, and beautiful.

### File: `src/cli/output.ts`

Handles all terminal output formatting.

### Welcome Screen

```typescript
export function displayWelcome(version: string, model: string): void {
  const terminalWidth = process.stdout.columns || 80;

  console.log('\n');
  
  // Title
  const title = chalk.bold.white('plnr') + chalk.dim(' · Plan First');
  console.log(centerText(title, terminalWidth));

  // Tagline
  console.log(centerText(chalk.dim('Plan before implementation'), terminalWidth));

  // Divider
  console.log(centerText(chalk.dim('─'.repeat(50)), terminalWidth));

  // Info
  console.log(centerText(chalk.dim(`v${version} • ${model}`), terminalWidth));

  // Commands
  console.log(centerText(
    chalk.white('/plan') + chalk.dim(' | ') + 
    chalk.white('/export') + chalk.dim(' | ') + 
    chalk.white('/cc') + chalk.dim(' | ') + 
    chalk.white('/clear'), 
    terminalWidth
  ));

  console.log('\n');
}
```

**Output:**
```
                    plnr · Plan First
                Plan before implementation
                  ──────────────────────────
                   v1.0.5 • x-ai/grok-4-fast
              /plan | /export | /cc | /clear
```

### Plan Display

```typescript
export function displayPlan(plan: Plan): void {
  console.log('\n' + chalk.bold.white('📋 Implementation Plan') + '\n');
  
  // Summary
  console.log(chalk.bold.white('Summary:'));
  console.log('  ' + chalk.white(plan.summary) + '\n');

  // Steps
  console.log(chalk.bold.white('Steps:'));
  plan.steps.forEach((step, index) => {
    console.log(chalk.white(`\n  ${index + 1}. ${step.title}`));
    console.log(chalk.dim('     ' + step.description));

    if (step.files_to_modify.length > 0) {
      console.log(chalk.dim('     Modify: ' + step.files_to_modify.join(', ')));
    }
    if (step.files_to_create.length > 0) {
      console.log(chalk.dim('     Create: ' + step.files_to_create.join(', ')));
    }
  });

  // Dependencies
  if (plan.dependencies_to_add.length > 0) {
    console.log('\n' + chalk.bold.white('📦 Dependencies:'));
    plan.dependencies_to_add.forEach(dep => {
      console.log(chalk.white('  • ' + dep));
    });
  }

  // Risks
  if (plan.risks.length > 0) {
    console.log('\n' + chalk.bold.white('⚠️  Risks:'));
    plan.risks.forEach(risk => {
      console.log(chalk.dim('  • ' + risk));
    });
  }

  console.log('');
}
```

### Markdown Rendering

```typescript
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

marked.use(markedTerminal({
  code: chalk.white,
  blockquote: chalk.dim.italic,
  heading: chalk.bold.white,
  list: chalk.white,
  listitem: chalk.white,
  strong: chalk.bold.white,
  em: chalk.italic.gray,
  codespan: chalk.cyan,
  link: chalk.cyan.underline,
}) as any);

export function renderMarkdown(markdown: string): string {
  try {
    return marked(markdown) as string;
  } catch {
    return markdown; // Fallback to raw text
  }
}
```

**What it renders:**
- `# Heading` → Bold white heading
- `**bold**` → Bold white text
- `*italic*` → Italic gray text
- `` `code` `` → Cyan code span
- Code blocks → White text
- Lists → White bullets

### File: `src/cli/interactive-input.ts`

This is a custom-built readline-based input system with advanced features.

### Features

1. **Tab Completion**
   - Commands (press `/` then Tab)
   - File mentions (press `@` then Tab)
   - Fuzzy search with Fuse.js

2. **Mode Switching**
   - Shift+Tab toggles between Chat and Plan modes
   - Mode displayed below input box

3. **Bordered Input Box**
   - Beautiful box around input
   - Word wrapping for long input
   - Multi-line support

4. **Advanced Editing**
   - Alt+Backspace: Delete word
   - Alt+Arrow: Move by word
   - Ctrl+U: Clear line
   - Ctrl+W: Delete word before cursor
   - Ctrl+A/E: Jump to start/end

### Architecture

```typescript
export async function getInteractiveInput(options: InteractiveInputOptions): Promise<InteractiveInputResult> {
  return new Promise((resolve) => {
    let inputBuffer = '';
    let cursorPosition = 0;
    let suggestions: Suggestion[] = [];
    let selectedIndex = 0;
    let showMenu = false;
    let currentMode: InputMode = initialMode || 'chat';

    // Setup readline for raw input
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const render = () => {
      // Draw bordered box
      // Show mode indicator
      // Display autocomplete menu if needed
      // Position cursor correctly
    };

    const handleKeypress = (str: string, key: readline.Key) => {
      // Handle Ctrl+C, Enter, Tab, arrows, etc.
      // Update inputBuffer and suggestions
      // Re-render
    };

    process.stdin.on('keypress', handleKeypress);
    render();
  });
}
```

### Autocomplete Implementation

```typescript
const getSuggestions = (input: string): Suggestion[] => {
  // For / commands
  if (input.startsWith('/') && !input.includes(' ')) {
    const query = input.substring(1);
    const matches = commands.filter(c => c.name.substring(1).startsWith(query));
    return matches.map(c => ({ 
      value: c.name, 
      display: c.name, 
      description: c.description 
    }));
  }

  // For @ file mentions
  const lastAtIndex = input.lastIndexOf('@');
  if (lastAtIndex !== -1) {
    const afterAt = input.substring(lastAtIndex + 1);
    const beforeAt = input.substring(0, lastAtIndex);

    // Still typing after @
    if (!afterAt.includes(' ')) {
      const searchTerm = afterAt;

      if (!searchTerm) {
        // Show all files
        return files.slice(0, 10).map(f => ({
          value: beforeAt + '@' + f,
          display: f,
          description: ''
        }));
      }

      // Fuzzy search
      let matchingFiles: string[] = [];
      if (filesFuse) {
        const results = filesFuse.search(searchTerm, { limit: 10 });
        matchingFiles = results.map(r => r.item);
      } else {
        matchingFiles = files
          .filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 10);
      }

      return matchingFiles.map(f => ({
        value: beforeAt + '@' + f,
        display: f,
        description: ''
      }));
    }
  }

  return [];
};
```

**How it works:**
1. User types `/p` → Suggestions: `/plan`
2. User presses Tab → Autocompletes to `/plan`
3. User types `@sr` → Suggestions: `src/index.ts`, `src/auth.ts`, etc.
4. User arrows down → Selects different file
5. User presses Enter → Fills input with selected file

### Bordered Box Rendering

The input box is drawn character by character with ANSI escape codes:

```
╭──────────────────────────────────────────────────╮
│ ❯ How does authentication work in @src/auth.ts  │
╰──────────────────────────────────────────────────╯
  Mode: Chat (Shift+Tab to switch)
```

**Challenges solved:**
- Word wrapping for long input
- ANSI color codes don't count as visible characters
- Cursor positioning in multi-line input
- Menu overlay without clearing main display

---

## Prompt Building

### File: `src/planning/prompt-builder.ts`

Constructs the prompt sent to OpenRouter based on context and conversation history.

### Function Signature

```typescript
export function buildPlanningPrompt(
  context: CodebaseContext,
  task: string,
  conversationHistory: Array<{task: string, plan: Plan}> = [],
  isPlanning: boolean = true
): string
```

### Chat Mode Prompt (Lines 28-68)

```typescript
if (!isPlanning) {
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
```

### Planning Mode Prompt (Lines 72-125)

```typescript
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
```

### Files Context

```typescript
const filesContext = context.relevantFiles
  .map(file => {
    const relativePath = file.path.replace(context.projectRoot + '/', '');
    return `\n### ${relativePath}\n\`\`\`\n${file.content?.slice(0, 1500) || ''}\n\`\`\``;
  })
  .join('\n');
```

**Why 1500 characters per file?**
- Most files don't need full content in initial prompt
- AI can call `read_file` tool for complete content
- Saves tokens in initial request

### Conversation History

```typescript
const historyContext = conversationHistory.length > 0
  ? `\n## Previous Conversation\n\n${conversationHistory.map((item, i) =>
      `### Exchange ${i + 1}\n**User:** ${item.task}\n**Summary:** ${item.plan.summary}`
    ).join('\n\n')}\n`
  : '';
```

**Why include history?**
- AI remembers previous questions
- Can reference earlier answers
- Maintains context across multiple questions

---

## Export System

### File: `src/exporters/prd-writer.ts`

Exports plans as markdown PRDs (Product Requirement Documents).

### Main Function

```typescript
export async function exportPRD(plan: Plan, task: string, projectRoot: string): Promise<string> {
  try {
    // Create output directory
    const outputDir = path.join(projectRoot, '.cengine');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `plan-${timestamp}.md`;
    const filePath = path.join(outputDir, filename);

    // Generate content
    const content = generatePRDContent(plan, task);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  } catch (error) {
    logger.error('Error exporting PRD:', error);
    throw error;
  }
}
```

### PRD Template

```typescript
function generatePRDContent(plan: Plan, task: string): string {
  return `# Implementation Plan

**Task**: ${task}
**Generated**: ${new Date().toLocaleString()}

---

## Summary

${plan.summary}

---

## Implementation Steps

${plan.steps.map((step, index) => `
### Step ${index + 1}: ${step.title}

${step.description}

**Files to Modify:**
${step.files_to_modify.length > 0 ? step.files_to_modify.map(f => `- ${f}`).join('\n') : '- None'}

**Files to Create:**
${step.files_to_create.length > 0 ? step.files_to_create.map(f => `- ${f}`).join('\n') : '- None'}

**Code Changes:**
${step.code_changes}
`).join('\n---\n')}

---

## Dependencies to Add

${plan.dependencies_to_add.length > 0
  ? plan.dependencies_to_add.map(dep => `- ${dep}`).join('\n')
  : 'No new dependencies required'}

---

## Risks & Considerations

${plan.risks.length > 0
  ? plan.risks.map(risk => `- ${risk}`).join('\n')
  : 'No significant risks identified'}

---

*Generated by PLNR*
`;
}
```

**Example output:**
```markdown
# Implementation Plan

**Task**: Add JWT authentication
**Generated**: 1/8/2025, 3:45:00 PM

---

## Summary

Implement JWT-based authentication using jsonwebtoken library. Add middleware to protect routes and user login/logout endpoints.

---

## Implementation Steps

### Step 1: Install Dependencies

Install jsonwebtoken and bcrypt for password hashing...

**Files to Modify:**
- None

**Files to Create:**
- None

**Code Changes:**
npm install jsonwebtoken bcrypt @types/jsonwebtoken @types/bcrypt

---

### Step 2: Create Auth Middleware

Create middleware to verify JWT tokens on protected routes...

**Files to Modify:**
- src/server.ts

**Files to Create:**
- src/middleware/auth.ts

**Code Changes:**
[detailed code here]

---

## Dependencies to Add

- jsonwebtoken@^9.0.0 (JWT token generation and verification)
- bcrypt@^5.1.0 (Password hashing)

---

## Risks & Considerations

- Ensure JWT secrets are stored in environment variables
- Implement token refresh mechanism for better UX
- Add rate limiting to prevent brute force attacks

---

*Generated by PLNR*
```

---

## Utilities

### File: `src/utils/logger.ts`

Simple but effective logging system.

```typescript
import chalk from 'chalk';

export const logger = {
  debug: (...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  },

  info: (...args: any[]) => {
    console.log(chalk.blue('[INFO]'), ...args);
  },

  success: (...args: any[]) => {
    console.log(chalk.green('✓'), ...args);
  },

  error: (...args: any[]) => {
    console.error(chalk.red('✗'), ...args);
  },

  warn: (...args: any[]) => {
    console.warn(chalk.yellow('[WARN]'), ...args);
  }
};
```

**Usage:**
```typescript
logger.debug('Token count:', tokenCount);
logger.info('Reading file:', filePath);
logger.success('Plan generated successfully');
logger.error('Failed to read file:', error);
logger.warn('No package.json found');
```

**Debug mode:**
- Set `DEBUG=true` environment variable
- Shows internal operations
- Useful for troubleshooting

### File: `src/utils/parse-mentions.ts`

Parses @-mentioned files from user input.

```typescript
export function parseMentionedFiles(input: string): string[] {
  const mentions: string[] = [];
  const regex = /@([^\s@]+)/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}
```

**Regex breakdown:**
- `@` - Literal @ character
- `([^\s@]+)` - Capture group: one or more non-whitespace, non-@ chars
- `g` - Global flag (find all matches)

**Examples:**
- `"Explain @src/auth.ts"` → `["src/auth.ts"]`
- `"Compare @foo.js and @bar.js"` → `["foo.js", "bar.js"]`
- `"Look at @src/utils/*.ts"` → `["src/utils/*.ts"]`

---

## Data Flow & Architecture

Let's trace a complete request through the system.

### Example: User asks "How does authentication work?"

#### Step 1: User Input (interactive-input.ts)

```
User types: "How does authentication work?"
Mode: Chat

getInteractiveInput() returns:
{
  input: "How does authentication work?",
  mode: "chat"
}
```

#### Step 2: Parse Input (index.tsx)

```typescript
const fileMatches = input.match(/@([\w\/.\\-]+)/g);
const mentionedFiles = fileMatches ? fileMatches.map(m => m.substring(1)) : [];
// mentionedFiles = [] (no @-mentions)
```

#### Step 3: Gather Context (context/gatherer.ts)

```typescript
context = await gatherContext(projectRoot, input, mentionedFiles);

// Returns:
{
  projectRoot: "/Users/ayush/my-app",
  language: "TypeScript",
  framework: "Express",
  dependencies: ["express", "jsonwebtoken", "bcrypt", ...],
  fileTree: "src/\nsrc/auth/\nsrc/auth/login.ts\n...",
  relevantFiles: [] // No @-mentions
}
```

#### Step 4: Generate Plan (planning/planner.ts)

```typescript
const response = await generatePlan(context, input, conversationHistory, false);
```

**Inside generatePlan:**

**Iteration 1:**
- AI receives context and task
- AI response: Tool call `search_files("authentication")`
- Execute tool: Returns files containing "authentication"
- Add result to messages

**Iteration 2:**
- AI receives search results
- AI response: Tool call `read_file("src/auth/login.ts")`
- Execute tool: Returns file contents
- Add result to messages

**Iteration 3:**
- AI receives file contents
- AI response: Tool call `read_file("src/middleware/auth.ts")`
- Execute tool: Returns file contents
- Add result to messages

**Iteration 4:**
- AI receives both files
- AI response: Final answer (no more tool calls)
- Content: Markdown explanation of authentication

**Returns:**
```typescript
{
  summary: "Authentication in this app uses JWT tokens. The login flow (src/auth/login.ts) validates credentials and issues tokens. Protected routes use middleware (src/middleware/auth.ts) to verify tokens and attach user data to requests.",
  steps: [],
  dependencies_to_add: [],
  risks: [],
  tokensUsed: 12500
}
```

#### Step 5: Display Response (cli/output.ts)

```typescript
console.log(renderMarkdown(response.summary));
```

**Terminal output:**
```
✨ Response:

Authentication in this app uses JWT tokens. The login flow 
(src/auth/login.ts) validates credentials and issues tokens. 
Protected routes use middleware (src/middleware/auth.ts) to verify 
tokens and attach user data to requests.

Key files:
• src/auth/login.ts - Handles user login
• src/middleware/auth.ts - JWT verification middleware

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model: x-ai/grok-4-fast                    Tokens: 12.5k
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 6: Add to Conversation History

```typescript
conversationHistory.push({ 
  task: "How does authentication work?", 
  plan: response 
});
```

**Why?**
- Next question can reference this context
- AI remembers what it already explained
- User can ask follow-up questions

---

## Deep Dive: How Everything Works Together

Let's walk through a complex scenario: **Planning and implementing JWT authentication**

### Phase 1: Planning

**User command:** `/plan Add JWT authentication to the Express app`

#### 1.1 Main Loop (index.tsx:560-618)

```typescript
// Detect /plan command
if (input.startsWith('/plan ')) {
  task = input.substring(6).trim();
  // task = "Add JWT authentication to the Express app"
  
  currentTask = task;
  
  // Gather context if not already gathered
  if (!context) {
    context = await gatherContext(projectRoot, task, mentionedFiles);
  }
  
  // Generate plan with conversation history
  currentPlan = await generatePlan(context, task, conversationHistory, true);
  
  // Add to history
  conversationHistory.push({ task, plan: currentPlan });
  
  // Display the plan
  displayPlan(currentPlan);
}
```

#### 1.2 Context Gathering (context/gatherer.ts)

```typescript
// Scan project
const fileTree = await readProjectStructure(projectRoot);
// Returns:
// src/
// src/server.ts
// src/routes/
// src/routes/api.ts
// package.json
// ...

const packageJson = await readPackageJson(projectRoot);
// Returns:
// { dependencies: { express: "^4.18.0", ... }, ... }

const framework = detectFramework(packageJson.dependencies);
// Returns: "Express"

const language = detectLanguage(fileTree);
// Returns: "TypeScript"

// Result:
{
  projectRoot: "/Users/ayush/my-app",
  language: "TypeScript",
  framework: "Express",
  dependencies: ["express", "body-parser", "cors"],
  fileTree: "src/\nsrc/server.ts\n...",
  relevantFiles: [] // No @-mentions
}
```

#### 1.3 Prompt Building (planning/prompt-builder.ts)

```typescript
const prompt = buildPlanningPrompt(context, task, conversationHistory, true);
```

**Generated prompt:**
```
# Task
Add JWT authentication to the Express app

# Codebase Analysis

## Technology Stack
- **Primary Language**: TypeScript
- **Framework/Runtime**: Express
- **Key Dependencies**: express, body-parser, cors

## Project Structure (Key Directories)
```
src/
src/server.ts
src/routes/
src/routes/api.ts
package.json
```

## Relevant Source Files
(empty - no @-mentions)

# Your Mission
As an expert software architect, analyze the above codebase and create a detailed, actionable implementation plan...

## Output Requirements
Respond with a JSON object following this exact structure:
{
  "summary": "...",
  "steps": [...],
  ...
}
```

#### 1.4 Tool Calling Loop (planning/planner.ts)

**Iteration 1: Search for existing auth**
```
→ AI calls: search_files("authentication")
→ Execute: grep -r -i --exclude-dir=node_modules -n "authentication" . | head -n 10
→ Result: "No matches found"
→ Add to messages
```

**Iteration 2: Read server entry point**
```
→ AI calls: read_file("src/server.ts")
→ Execute: readFile("/Users/ayush/my-app/src/server.ts")
→ Result: [file contents]
→ Add to messages
```

**Iteration 3: Check package.json**
```
→ AI calls: read_file("package.json")
→ Execute: readFile("/Users/ayush/my-app/package.json")
→ Result: [file contents]
→ Add to messages
```

**Iteration 4: Search for JWT examples**
```
→ AI calls: get_code_context("Express JWT authentication example")
→ Execute: Exa API call
→ Result: [code examples from web]
→ Add to messages
```

**Iteration 5: Final response**
```
→ AI returns: JSON plan (no more tool calls)
→ Parse JSON
→ Return Plan object
```

#### 1.5 Plan Display (cli/output.ts)

```
📋 Implementation Plan

Summary:
  Implement JWT-based authentication for the Express app using 
  the jsonwebtoken library. Create middleware for token verification, 
  login/logout endpoints, and protect existing routes.

Steps:

  1. Install Dependencies
     Install jsonwebtoken and bcrypt for JWT and password hashing
     Modify: package.json
     Create: None

  2. Create Auth Middleware
     Implement middleware to verify JWT tokens on protected routes
     Modify: src/server.ts
     Create: src/middleware/auth.ts

  3. Add Login Endpoint
     Create POST /auth/login endpoint to authenticate users
     Modify: src/server.ts
     Create: src/routes/auth.ts

  4. Add Logout Endpoint
     Create POST /auth/logout endpoint (optional, JWT is stateless)
     Modify: src/routes/auth.ts

  5. Protect Existing Routes
     Apply auth middleware to routes that require authentication
     Modify: src/routes/api.ts

📦 Dependencies:
  • jsonwebtoken@^9.0.0 (JWT generation and verification)
  • bcrypt@^5.1.0 (Password hashing)
  • @types/jsonwebtoken@^9.0.0 (TypeScript types)
  • @types/bcrypt@^5.0.0 (TypeScript types)

⚠️  Risks:
  • JWT secret must be stored securely in environment variables
  • Token expiration should be balanced (not too short or too long)
  • Consider implementing refresh tokens for better UX
  • Add rate limiting to login endpoint to prevent brute force

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model: x-ai/grok-4-fast                  Tokens: 18.5k
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Plan generated! Type /export to save, or continue chatting.
```

### Phase 2: Export

**User command:** `/export`

#### 2.1 Export Handler (index.tsx:157-176)

```typescript
if (input.startsWith('/export')) {
  if (!currentPlan || !currentTask) {
    displayError('No plan to export. Generate a plan first.');
    continue;
  }

  try {
    const filePath = await exportPRD(currentPlan, currentTask, projectRoot);
    displaySuccess(`Plan exported to: ${filePath}`);
  } catch (error: any) {
    displayError(error.message);
  }
}
```

#### 2.2 PRD Writer (exporters/prd-writer.ts)

```typescript
// Create .cengine directory
await fs.mkdir("/Users/ayush/my-app/.cengine", { recursive: true });

// Generate filename
const timestamp = "2025-01-08T15-45-00";
const filename = "plan-2025-01-08T15-45-00.md";
const filePath = "/Users/ayush/my-app/.cengine/plan-2025-01-08T15-45-00.md";

// Generate markdown content
const content = generatePRDContent(currentPlan, currentTask);

// Write file
await fs.writeFile(filePath, content, 'utf-8');

// Return path
return filePath;
```

#### 2.3 Terminal Output

```
✓ Plan exported to: /Users/ayush/my-app/.cengine/plan-2025-01-08T15-45-00.md
```

### Phase 3: Launch Claude Code

**User command:** `/cc`

#### 3.1 Claude Code Handler (index.tsx:179-298)

```typescript
if (input.startsWith('/cc')) {
  // Generate plan if needed
  if (!currentPlan) {
    displayInfo('No plan exists. Generating implementation plan first...');
    currentPlan = await generatePlan(context, taskForPlan, conversationHistory, true);
    displayPlan(currentPlan);
  }

  displayInfo('Preparing context for Claude Code...');

  // Build context file
  const contextContent = `# plnr Analysis

## Project Overview
- **Language**: TypeScript
- **Framework**: Express
- **Dependencies**: express, body-parser, cors, jsonwebtoken, bcrypt

## Files Analyzed
- src/server.ts
- src/routes/api.ts
- package.json

## Implementation Plan

Implement JWT-based authentication for the Express app...

### Steps
1. **Install Dependencies**: Install jsonwebtoken and bcrypt...
2. **Create Auth Middleware**: Implement middleware to verify JWT tokens...
...
`;

  // Write context file
  const contextFilePath = "/Users/ayush/my-app/.contextengine-context.md";
  await fs.writeFile(contextFilePath, contextContent, 'utf-8');

  // Export PRD as well
  const prdFilePath = await exportPRD(currentPlan, currentTask, projectRoot);

  // Launch Claude Code in new terminal
  spawn('osascript', [
    '-e',
    `tell application "Terminal" to do script "cd /Users/ayush/my-app && claude @.contextengine-context.md"`
  ], { detached: true, stdio: 'ignore' }).unref();

  displaySuccess('Claude Code starting in new terminal!');
}
```

#### 3.2 New Terminal Opens

**Terminal 1 (PLNR):**
```
✓ Context saved to: .contextengine-context.md
✓ Plan exported to: .cengine/plan-2025-01-08T15-45-00.md
→ Launching Claude Code in new terminal...

✓ Claude Code starting in new terminal!
→ You can continue using plnr here, or type /exit to quit.

❯ 
```

**Terminal 2 (Claude Code):**
```
Reading context from .contextengine-context.md...

I'll help you implement JWT authentication based on the plan. Let me start by installing the required dependencies:

npm install jsonwebtoken bcrypt @types/jsonwebtoken @types/bcrypt

Then I'll create the auth middleware...
```

**User can now:**
- Keep planning in PLNR (Terminal 1)
- Implement with Claude Code (Terminal 2)
- Switch between them as needed

---

## Key Design Decisions & Trade-offs

### 1. Tool Calling vs Upfront Loading

**Decision:** Use AI-guided tool calling

**Why?**
- **Token efficiency**: 50-70% reduction in token usage
- **Scalability**: Works with any codebase size
- **Flexibility**: AI finds relevant files we might miss

**Trade-off:**
- More API calls (but cheaper than tokens)
- Slightly slower (multiple round-trips)
- More complex implementation

### 2. OpenRouter vs Direct Model APIs

**Decision:** Use OpenRouter as gateway

**Why?**
- **Multi-model**: Access Grok, Claude, GPT-4 via one API
- **Cost efficiency**: Compare prices, choose best model
- **No vendor lock-in**: Easy to switch models
- **Unified interface**: Same code for all models

**Trade-off:**
- Extra hop (slight latency)
- Depends on OpenRouter uptime
- Pricing markup

### 3. Custom Input vs Library

**Decision:** Build custom readline-based input

**Why?**
- **Full control**: Exact UX we want
- **Performance**: Fast, no library overhead
- **Features**: @-mentions, mode switching, word wrapping
- **No deps**: One less dependency to maintain

**Trade-off:**
- More code to maintain
- Edge cases to handle (cursor positioning, ANSI codes)
- Testing complexity

### 4. ES Modules vs CommonJS

**Decision:** Use ES Modules (`type: "module"`)

**Why?**
- **Modern**: Future of Node.js
- **Top-level await**: Cleaner async code
- **Tree-shaking**: Better bundling (if needed)
- **Standard**: Same as browser

**Trade-off:**
- `.js` extensions required in imports
- `createRequire` needed for CommonJS interop
- Some old libraries incompatible

### 5. Minimal Context Loading

**Decision:** Load only @-mentioned files upfront

**Why?**
- **Speed**: Instant startup
- **Tokens**: Minimal initial context
- **AI-guided**: Let AI decide what else to read

**Trade-off:**
- More tool calls for complex queries
- AI might miss relevant files (rare)
- Requires good tool prompts

### 6. JSON Response Format

**Decision:** Require AI to return structured JSON

**Why?**
- **Parseable**: Can be programmatically processed
- **Consistent**: Always same structure
- **Export**: Easy to convert to markdown
- **Integration**: Other tools can consume it

**Trade-off:**
- AI sometimes wraps JSON in code blocks (need regex)
- Parsing errors if AI deviates
- Less natural for AI than free-form text

---

## Common Questions & Answers

### Q: How does PLNR decide which files to read?

**A:** It doesn't! The AI does. PLNR provides:
1. File tree (list of all files)
2. Package.json (dependencies)
3. Framework detection
4. @-mentioned files (if any)

Then the AI uses tools (`search_files`, `read_file`) to explore. For example:
- User asks about authentication
- AI calls `search_files("authentication")`
- Finds `src/auth/login.ts`
- AI calls `read_file("src/auth/login.ts")`
- Reads and analyzes it

### Q: What if the AI doesn't call the right tools?

**A:** The system prompt guides it:
- "Use search_files to locate relevant files"
- "Use read_file only on the most relevant files"
- "Be efficient with tool usage"

In practice, models like Grok and Claude are very good at this. If issues occur, we can:
1. Improve system prompts
2. Add examples (few-shot learning)
3. Filter or suggest tools based on query

### Q: Why not just load all files < 10KB?

**A:** Token waste. A 1000-file codebase might have:
- 300 files under 10KB
- 300 * 5KB average = 1.5MB = ~375K tokens
- Cost: $0.75 per query (at $2/M tokens)

With tool calling:
- 5-10 files actually read
- 10 * 5KB = 50KB = ~12.5K tokens
- Cost: $0.025 per query

**30x cheaper!**

### Q: How does conversation history work?

**A:** PLNR maintains an array:
```typescript
conversationHistory: Array<{task: string, plan: Plan}> = []
```

Each query/response pair is added:
```typescript
conversationHistory.push({ 
  task: "How does auth work?", 
  plan: { summary: "...", ... }
});
```

Next query includes history in prompt:
```
## Previous Conversation

### Exchange 1
**User:** How does auth work?
**Summary:** Authentication uses JWT tokens...

### Exchange 2
**User:** [current question]
```

AI can reference previous answers, maintain context.

### Q: What's the difference between Chat and Plan modes?

**A:**

**Chat Mode:**
- Conversational markdown response
- Shorter, concise answers
- 2-4 tool calls typical
- NO JSON structure requirement
- Good for questions

**Plan Mode:**
- Structured JSON response
- Detailed implementation steps
- 5-15 tool calls typical
- Must return JSON with steps, dependencies, risks
- Good for implementation planning

User switches with Shift+Tab.

### Q: How does streaming work?

**A:** OpenRouter supports Server-Sent Events (SSE) streaming:

```typescript
const stream = await openai.chat.completions.create({
  ...options,
  stream: true
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;
  if (delta?.content) {
    fullContent += delta.content;
    // Update spinner with progress
  }
}
```

**Benefits:**
- Shows progress during long responses
- Better UX (not frozen)
- Can cancel mid-stream

**When used:**
- Chat mode final responses
- After AI done with tool calls
- NOT during tool calling (need complete JSON)

### Q: Why 25 iteration limit?

**A:** Safety against infinite loops. In theory, AI could:
1. Call `search_files`
2. Get results
3. Call more tools
4. Repeat forever

25 iterations means:
- Typical query: 3-7 iterations (plenty of room)
- Complex query: 15-20 iterations (still works)
- Runaway: Stops at 25 (protects user's tokens)

Never seen a legitimate query hit 25.

### Q: How are tokens tracked?

**A:** OpenRouter returns usage in response:
```json
{
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  }
}
```

We accumulate across iterations:
```typescript
totalTokensUsed += completion.usage.total_tokens || 0;
```

Displayed in real-time:
```
  Tokens: 12.5k
```

And in final output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model: x-ai/grok-4-fast          Tokens: 12.5k
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Q: What's the difference between web_search and get_code_context?

**A:**

**web_search:**
- General web search (like Google)
- Returns web page titles, URLs, excerpts
- Good for: documentation, blog posts, guides
- Example: "Next.js 14 server actions tutorial"

**get_code_context:**
- Code-focused search
- Returns code examples, API docs
- Better structured for code consumption
- Example: "React useState hook example"

Both use Exa API but different endpoints.

### Q: How does file autocomplete work?

**A:** Multi-stage:

1. **Load files in background:**
```typescript
loadProjectFiles(projectRoot);
// Progressively scans: root → src → lib → ...
// Updates cachedFiles array
// Updates Fuse index
```

2. **User types @:**
```typescript
getSuggestions(input);
// Detects @ character
// Extracts text after @
// Searches cachedFiles with Fuse.js
```

3. **Display suggestions:**
```typescript
// Show top 10 matches
// User arrows to select
// Tab to complete
```

4. **Fuzzy matching:**
```typescript
filesFuse.search("aut", { limit: 10 });
// Returns: ["src/auth.ts", "src/auth-utils.ts", ...]
// Even with typos: "ath" matches "auth"
```

### Q: How does security scanning work?

**A:** Minimal context + targeted prompt:

```typescript
// Don't load any files upfront
const minimalContext = {
  projectRoot,
  language: "TypeScript",
  framework: "Express",
  dependencies: [...],
  relevantFiles: [],
  fileTree: "" // Empty!
};

// Ultra-focused prompt
const securityPrompt = `Security scan - CRITICAL issues only:
1. Hardcoded secrets (search: API_KEY, SECRET, PASSWORD, TOKEN)
2. Auth issues
3. SQL/XSS injection
4. Insecure endpoints

Max 10-15 tool calls. Search first, read only suspicious files.`;

// AI uses tools to find issues
const report = await generatePlan(minimalContext, securityPrompt, [], false);
```

**AI's typical flow:**
1. `search_files("API_KEY")` → Find hardcoded keys
2. `search_files("PASSWORD")` → Find password leaks
3. `read_file("src/config.ts")` → Check suspicious files
4. `search_files("SELECT.*FROM")` → Find SQL queries
5. Return findings

**Result:**
```
🛡️  SECURITY SCAN REPORT

1. ./src/config.ts:12
   Issue: Hardcoded API key
   Risk:  Critical
   Fix:   Move to environment variables

2. ./src/db/users.ts:34
   Issue: SQL injection vulnerability
   Risk:  High
   Fix:   Use parameterized queries
```

---

## Performance Considerations

### 1. File Loading

**Strategy:** Progressive background loading

```typescript
setImmediate(() => {
  loadProjectFiles(projectRoot).catch(() => {});
});
```

**Why `setImmediate`?**
- Render prompt first (instant)
- Load files in background
- User can start typing immediately

**Impact:**
- Perceived instant startup
- Autocomplete ready in 100-500ms
- Full file list within 1-2 seconds

### 2. Token Usage

**Optimization:** Smart pruning

- Keep: System prompt, user task, recent messages
- Remove: Failed tool calls, old results
- Dynamic: Based on context window size

**Result:**
- Long conversations stay under context limit
- Relevant context preserved
- Tokens saved: 30-50% on 10+ exchange conversations

### 3. API Calls

**Consideration:** Each tool call = API latency

**Typical latency:**
- read_file: 5-10ms (local disk)
- search_files: 50-100ms (grep)
- API call to OpenRouter: 500-1500ms

**Total query time:**
- Simple (3 tools): 2-3 seconds
- Complex (10 tools): 5-8 seconds

**Acceptable** because:
- Shows progress (tool names displayed)
- Live token counter
- Much cheaper than loading everything

### 4. Memory

**Considerations:**
- File tree: ~50KB for 1000 files
- Cached files array: ~200KB for 1000 files
- Fuse index: ~1MB for 1000 files
- Conversation history: ~10-50KB

**Total:** < 2MB for typical projects

**Node.js default:** 2GB heap

**No issue** even for 10,000+ file projects.

---

## Future Enhancements

### 1. Persistent Conversation History

**Current:** Lost on exit

**Future:** Save to `.cengine/history.json`

**Benefit:** Resume conversations across sessions

### 2. Multi-File Editing

**Current:** Plans describe changes

**Future:** Actually apply changes with user approval

**Benefit:** One-click implementation

### 3. Git Integration

**Current:** No git awareness

**Future:** Read git diff, suggest commits

**Benefit:** Plan changes for feature branches

### 4. Custom Tool Plugins

**Current:** Fixed set of tools

**Future:** User-defined tools via config

**Benefit:** Project-specific operations (run tests, deploy, etc.)

### 5. Visual Plan Viewer

**Current:** Terminal output only

**Future:** Web UI with interactive plan

**Benefit:** Share plans, collaborate, track progress

### 6. Plan Templates

**Current:** AI generates from scratch

**Future:** Common patterns (CRUD, auth, API endpoint)

**Benefit:** Faster, more consistent plans

---

## Troubleshooting Guide

### Issue: "OPENROUTER_API_KEY is required"

**Cause:** Environment variable not set

**Solution:**
```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"
# Or add to ~/.zshrc for persistence
```

### Issue: "No matches found" for @-mentions

**Cause:** File not in project, or not yet loaded

**Solutions:**
1. Wait 1-2 seconds for file loading to complete
2. Use relative path from project root
3. Check file actually exists: `ls src/auth.ts`

### Issue: AI returns invalid JSON

**Cause:** Model deviated from instructions

**Solutions:**
1. Try different model: `export MODEL="anthropic/claude-sonnet-4.5"`
2. Simplify query (less context = better JSON)
3. Check model supports tool calling (all OpenRouter models do)

### Issue: Tool calls seem inefficient

**Cause:** Model using too many or wrong tools

**Solutions:**
1. Improve system prompt (more specific instructions)
2. Use larger model (better reasoning)
3. Provide @-mentions to guide it

### Issue: "Command not found: plnr"

**Cause:** Not installed globally or PATH issue

**Solution:**
```bash
npm list -g plnr  # Check if installed
npm install -g plnr  # Reinstall
which plnr  # Check PATH
```

### Issue: Slow response times

**Causes:**
1. Large codebase (100k+ files)
2. Many tool calls needed
3. OpenRouter API latency

**Solutions:**
1. Use @-mentions to narrow scope
2. Use faster model: `MODEL="x-ai/grok-code-fast-1"`
3. Check internet connection

### Issue: Context overflow errors

**Cause:** Too much context, exceeded model limit

**Solutions:**
1. Prune old conversation: `/clear`
2. Use model with larger context window
3. @-mention only essential files

---

## Conclusion

PLNR is a sophisticated CLI tool that combines:
- **Smart context gathering** - Analyze codebases efficiently
- **AI-powered planning** - Generate detailed implementation plans
- **Tool calling** - Let AI explore and read files dynamically
- **Beautiful UX** - Professional terminal interface
- **Seamless integration** - Export and handoff to Claude Code/Codex

**Key innovations:**
1. Tool-guided file exploration (vs. upfront loading)
2. Dynamic context pruning (vs. fixed context)
3. Multi-mode interaction (Chat vs. Plan)
4. Real-time progress indicators
5. Platform-aware CLI integrations

**Architecture principles:**
- Modularity (clear separation of concerns)
- Efficiency (minimal token usage)
- User experience (responsive, informative)
- Extensibility (easy to add tools, models)

This document should give you complete understanding of how PLNR works, enabling you to:
- Answer any questions about the codebase
- Modify and extend functionality
- Troubleshoot issues
- Explain design decisions

Happy planning! 🚀

---

*Document version: 1.0*  
*Last updated: January 8, 2025*  
*Author: PLNR Team*
