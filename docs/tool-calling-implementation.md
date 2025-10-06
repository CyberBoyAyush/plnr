# Tool Calling Implementation

This document explains the implementation of model-guided tool calling in ContextEngine CLI.

## Overview

Previously, ContextEngine would load all relevant files upfront before sending context to the AI model. Now, the model intelligently decides which files to read and what operations to perform using tool calling.

## Architecture

### Tool Definitions (`src/tools/definitions.ts`)

Defines four tools that the AI model can use:

1. **read_file** - Read specific file contents
2. **search_files** - Search for text patterns using grep
3. **list_files** - List files matching patterns
4. **execute_command** - Execute safe read-only commands (ls, grep, find, etc.)

### Tool Handlers (`src/tools/handlers.ts`)

Implements the actual execution logic for each tool:
- Safe file operations with size limits
- Grep-based search with result limiting
- Command execution with whitelist validation
- Error handling and result formatting

### OpenRouter Integration (`src/planning/openrouter.ts`)

Added `callOpenRouterWithTools()` function that:
- Sends messages with tool definitions
- Uses OpenRouter's tool calling API
- Returns completion with potential tool calls

### Tool Calling Loop (`src/planning/planner.ts`)

Implements an iterative tool calling loop:
1. Send user query with available tools
2. Model decides which tools to call (if any)
3. Execute tool calls and collect results
4. Send tool results back to model
5. Repeat until model provides final response
6. Maximum 10 iterations for safety

### Context Gathering (`src/context/gatherer.ts`)

Simplified to:
- Read only @-mentioned files upfront
- Provide basic project structure (file tree, dependencies, framework)
- Let model request additional files via tools

### CLI Integration (`src/index.tsx`)

Updated to:
- Parse @-mentioned files from user input
- Pass mentioned files to `gatherContext()`
- Display tool usage during execution

## Benefits

1. **Reduced Token Usage** - Only loads files that are actually needed
2. **Model-Guided Exploration** - AI decides what to read based on query
3. **Scalability** - Works with any codebase size
4. **@-mentions Priority** - User-specified files are loaded immediately
5. **Progressive Context** - Builds context incrementally as needed

## Usage Example

```bash
# User asks about authentication
> How does authentication work in this app?

# Model might call:
# 1. search_files("authentication")
# 2. read_file("src/auth/login.ts")
# 3. read_file("src/middleware/auth.ts")
# Then provides answer based on those files

# User can force specific files with @
> Explain @src/auth/config.ts
# Config file is loaded immediately and available in context
```

## File Changes

- **Created**: `src/tools/definitions.ts`, `src/tools/handlers.ts`, `src/utils/parse-mentions.ts`
- **Modified**: `src/planning/openrouter.ts`, `src/planning/planner.ts`, `src/context/gatherer.ts`, `src/index.tsx`
- **Minimal Changes**: Implementation kept lean with focused modifications

## Technical Details

- Uses OpenAI SDK's tool calling interface (compatible with OpenRouter)
- Tool results returned as 'tool' role messages
- Safe command execution with whitelist
- File size limits to prevent context overflow
- Grep output limited to 100 results
- Tool calling limited to 10 iterations
