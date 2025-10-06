# ContextEngine - Project Documentation

## Project Overview

**Name:** ContextEngine  
**CLI Command:** `cengine`  
**Purpose:** AI-powered planning layer for coding agents (Claude Code, Cursor, etc.)

**Core Idea:** Analyze codebase → Generate detailed plan → Export PRD or launch Claude Code with context

---

## Tech Stack

### Core
- **TypeScript** + **Node.js**
- **pnpm** (package manager)

### Dependencies
```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "ink": "^4.0.0",
    "ink-text-input": "^5.0.0",
    "ink-select-input": "^5.0.0",
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "glob": "^10.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

---

## Project Structure

```
contextengine/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── config.ts                   # Config & env vars
│   │
│   ├── cli/
│   │   ├── ui.tsx                  # Main Ink UI
│   │   └── output.ts               # Console formatting
│   │
│   ├── context/
│   │   ├── gatherer.ts             # Orchestrate context collection
│   │   ├── reader.ts               # File operations (fs, glob)
│   │   ├── analyzer.ts             # Detect framework/patterns
│   │   └── filter.ts               # Smart file filtering with AI
│   │
│   ├── planning/
│   │   ├── planner.ts              # Main planning logic
│   │   ├── openrouter.ts           # OpenRouter API client
│   │   └── prompt-builder.ts       # Build AI prompts
│   │
│   ├── exporters/
│   │   ├── prd-writer.ts           # Export PRD markdown
│   │   └── claude-code.ts          # Launch Claude Code
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   │
│   └── utils/
│       └── logger.ts               # Logging utilities
│
├── .env.example
├── .env                            # Gitignored
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Components

### 1. CLI Layer (`cli/`)
- **ui.tsx**: Ink React components for terminal UI
- **output.ts**: Pretty printing, spinners, colors

### 2. Context Layer (`context/`)
- **gatherer.ts**: Scan project, gather context
- **reader.ts**: Read files with glob patterns
- **analyzer.ts**: Detect framework (Express, Next.js, etc.)
- **filter.ts**: Use AI to find relevant files only

### 3. Planning Layer (`planning/`)
- **planner.ts**: Orchestrate planning workflow
- **openrouter.ts**: API calls to OpenRouter
- **prompt-builder.ts**: Format prompts for AI

### 4. Exporters (`exporters/`)
- **prd-writer.ts**: Generate markdown PRD
- **claude-code.ts**: Spawn Claude Code with context

---

## Key Types

```typescript
interface CodebaseContext {
  projectRoot: string;
  framework?: string;
  language: string;
  dependencies: string[];
  fileTree: string;
  relevantFiles: FileInfo[];
}

interface Plan {
  summary: string;
  steps: Step[];
  dependencies_to_add: string[];
  risks: string[];
}

interface Step {
  title: string;
  description: string;
  files_to_modify: string[];
  files_to_create: string[];
  code_changes: string;
}
```

---

## Environment Variables

```bash
# .env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
NODE_ENV=development
DEBUG=true
```

---

## Development Workflow

### Initial Setup
```bash
pnpm install
cp .env.example .env
# Add OpenRouter API key to .env
```

### Development Mode (Auto-reload)
```bash
# Watch mode
pnpm dev

# Or run directly
pnpm tsx watch src/index.ts
```

### Link Globally (Test in any project)
```bash
# In contextengine directory
pnpm link --global

# Now use in any project
cd ~/my-express-api
cengine plan "add authentication"

# Unlink when done
pnpm unlink --global
```

### Build
```bash
pnpm build
```

---

## package.json Scripts

```json
{
  "name": "contextengine",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "cengine": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## User Flow

```
1. User: cengine
2. Interactive UI appears
3. User enters: "Add user authentication with JWT"
4. Tool gathers relevant context from codebase
5. AI generates detailed plan
6. User selects:
   → Export as PRD
   → Run Claude Code (/cc)
   → Save for later
```

---

## AI Strategy (OpenRouter)

### Two-Stage Approach

**Stage 1: Filter Context (Fast)**
- Model: `x-ai/grok-code-fast-1`
- Input: Project structure + task
- Output: List of relevant files
- Purpose: Avoid reading entire codebase

**Stage 2: Generate Plan (Smart)**
- Model: `x-ai/grok-code-fast-1`
- Input: Relevant context + task
- Output: Structured plan (JSON)
- Purpose: Detailed implementation plan

---

## MVP Features (4-6 hours)

### Must Have ✅
- Interactive Ink UI
- Context gathering (files, package.json, framework detection)
- OpenRouter integration
- Plan generation
- PRD export

### Nice to Have ⭐
- Smart context filtering with AI
- `/cc` command (launch Claude Code)
- Multiple models support

### Skip for MVP ❌
- Plan editing
- History/versioning
- Multiple export formats

---

## CLI Commands

```bash
cengine                    # Interactive mode
cengine plan <task>        # Quick plan
```

### Interactive Commands
```
/cc         - Launch Claude Code
/export     - Export PRD
/quit       - Exit
```

---

## Testing Locally

```bash
# Link globally
cd contextengine
pnpm link --global

# Test in any real project
cd ~/your-express-api
cengine plan "add rate limiting"

# Watch mode while developing
cd contextengine
pnpm dev
```

Test on different frameworks:
- Express.js API
- Next.js app
- Simple Node.js project

---

## Success Criteria

### Functionality
- ✅ Gathers codebase context
- ✅ Generates implementation plan
- ✅ Exports readable PRD
- ✅ Works on different projects

### Code Quality
- ✅ Clean TypeScript with types
- ✅ Modular architecture
- ✅ No hardcoded values
- ✅ Error handling

### UX
- ✅ Clean terminal UI
- ✅ Progress indicators
- ✅ Clear error messages

---

## File Operations

### Context Gathering
```typescript
// Use glob for file patterns
import { glob } from 'glob';

// Read package.json
import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

// Get relevant files
const files = await glob('src/**/*.ts', { 
  ignore: ['node_modules/**', 'dist/**'] 
});
```

### PRD Export
```typescript
// Write to .cengine/ directory
fs.mkdirSync('.cengine', { recursive: true });
fs.writeFileSync('.cengine/plan.md', prdContent);
```

---

## Debugging

```typescript
// Use logger
import { logger } from './utils/logger';

logger.debug('Context:', context);
logger.info('Calling AI...');
logger.success('Plan generated');
logger.error('API failed:', error);
```

---

## Common Issues & Solutions

**Issue:** `command not found: cengine`
```bash
pnpm link --global
# Or check: pnpm list --global
```

**Issue:** TypeScript errors
```bash
pnpm tsc --noEmit  # Check types without building
```

**Issue:** Watch mode not reloading
```bash
# Kill process and restart
pnpm dev
```

---

## Resources

- [OpenRouter Docs](https://openrouter.ai/docs)
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Commander.js](https://github.com/tj/commander.js)
- [pnpm CLI](https://pnpm.io/cli/add)

---

## Quick Reference

```bash
# Setup
pnpm install
pnpm link --global

# Development
pnpm dev

# Test
cd ~/any-project && cengine

# Build
pnpm build

# Unlink
pnpm unlink --global
```