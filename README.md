# plnr - Plan Before Implementation

[![npm version](https://badge.fury.io/js/plnr.svg)](https://www.npmjs.com/package/plnr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> AI-powered planning tool for your codebase

## What is plnr?

plnr analyzes your codebase, understands its structure, and generates detailed implementation plans for new features or changes. It's designed to work seamlessly with AI coding assistants by providing them with rich context and structured plans.

**Plan before implementation** - Make better decisions with AI-powered planning.

## Features

- 🔍 **Smart Context Gathering**: Automatically analyzes your codebase structure, dependencies, and framework
- 🤖 **AI-Powered Planning**: Generates detailed step-by-step implementation plans using OpenRouter
- 🌐 **Web Search**: Integrated Exa search for up-to-date documentation and code examples
- 📋 **PRD Export**: Export plans as structured markdown documents
- 🎨 **Beautiful CLI**: Professional terminal UI with progress indicators and spinners
- ⚡ **Fast & Efficient**: Focuses only on relevant files to avoid overwhelming context
- 👁️ **Transparent**: Shows exactly which files are being read and analyzed
- 🚀 **Real-time Feedback**: Step-by-step progress with visual indicators

## Installation

### Install Globally via npm

```bash
npm install -g plnr
```

### Install Globally via pnpm

```bash
pnpm add -g plnr
```

## Setup

### 1. Get API Keys

- **OpenRouter API Key** (Required): Get from [OpenRouter](https://openrouter.ai/)
- **Exa API Key** (Optional): Get from [Exa](https://exa.ai/) for web search features

### 2. Configure Environment Variables

After installing globally, you need to set up your API keys. Choose one method:

#### Option A: Add to Shell Profile (Recommended)

Add these lines to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"
export EXA_API_KEY="your-exa-api-key"  # Optional
export MODEL="x-ai/grok-4-fast"  # Optional, defaults to grok-4-fast
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

#### Option B: One-Line Setup Command

Run this command once to add to your shell profile:

```bash
# For bash
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.bashrc && source ~/.bashrc

# For zsh (macOS default)
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.zshrc && source ~/.zshrc
```

Replace `sk-or-v1-xxxxx` with your actual API key.

#### Option C: Set Per-Command

Run `plnr` with environment variables inline:

```bash
OPENROUTER_API_KEY="sk-or-v1-xxxxx" plnr
```

### 3. Verify Installation

```bash
plnr --version
```

## Quick Start

```bash
# 1. Install globally
npm install -g plnr

# 2. Set your API key (choose one method)
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"

# 3. Navigate to your project
cd ~/my-project

# 4. Run plnr
plnr
```

## Usage

### Interactive Mode

Navigate to any project directory and run:

```bash
plnr
```

This launches an interactive UI where you can:
1. **Chat** about your codebase
2. **Generate plans** with `/plan [task]`
3. **Search the web** for documentation (automatic when needed)
4. **Export as PRD** with `/export`
5. **Hand off to Claude Code** with `/cc`

### Available Commands

- `/plan [task]` - Generate an implementation plan
- `/export` - Export plan as markdown
- `/cc` - Launch Claude Code with context
- `/security-check` - Run security scan on codebase
- `/clear` - Clear conversation and start fresh
- `/help` - Show help message
- `/exit` - Exit plnr

### File Mentions

Use `@` to mention specific files:

```bash
❯ Explain @src/auth.ts
❯ /plan Add JWT to @src/index.ts
```

## Example Workflow

```bash
# Navigate to your project
cd ~/my-project

# Start plnr
plnr

# Ask questions about your code
❯ how does authentication work?

# Generate a plan
❯ /plan Add JWT authentication

# Search for examples (automatic)
❯ how to implement JWT with Express?

# Export the plan
❯ /export

# Hand off to Claude Code
❯ /cc
```

## How It Works

1. **Context Gathering**: Scans your project structure, reads package.json, detects framework
2. **Relevance Filtering**: Identifies key files related to your task
3. **AI Planning**: Sends context to OpenRouter's AI to generate structured plan
4. **Output**: Displays plan in terminal or exports as markdown PRD

## Supported Frameworks

- Next.js
- Express
- React
- Vue
- Angular
- NestJS
- Fastify
- Koa

## Project Structure

```
plnr/
├── src/
│   ├── cli/           # Terminal UI and interactive input
│   ├── context/       # Codebase analysis and file reading
│   ├── planning/      # AI planning with tool calling
│   ├── tools/         # Tool definitions and handlers
│   ├── exporters/     # PRD generation
│   ├── types/         # TypeScript definitions
│   └── utils/         # Utilities
├── dist/              # Compiled output
└── docs/              # Documentation
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | - | Your OpenRouter API key |
| `EXA_API_KEY` | ❌ No | - | Exa API key for web search |
| `MODEL` | ❌ No | `x-ai/grok-4-fast` | Model to use (any OpenRouter model) |
| `MODEL_CONTEXT_WINDOW` | ❌ No | `2000000` | Model context window size |

### Changing Models

You can use any model from OpenRouter. Here are some recommended models:

```bash
# Fast models (recommended for speed)
export MODEL="x-ai/grok-4-fast"
export MODEL="x-ai/grok-code-fast-1"

# High-quality models (recommended for accuracy)
export MODEL="anthropic/claude-sonnet-4.5"
export MODEL="openai/gpt-5"
```

See [OpenRouter Models](https://openrouter.ai/models) for the full list.

## Troubleshooting

### Command not found: plnr

If `plnr` is not found after installation:

```bash
# Check if installed globally
npm list -g plnr

# Reinstall if needed
npm install -g plnr
```

### Missing API Key Error

If you see "OPENROUTER_API_KEY is required":

```bash
# Verify environment variable is set
echo $OPENROUTER_API_KEY

# If empty, set it:
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"

# Add to shell profile for persistence
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.zshrc
source ~/.zshrc
```

### Permission Errors on Linux/macOS

If you get EACCES errors during install:

```bash
# Use sudo (not recommended)
sudo npm install -g plnr

# OR fix npm permissions (recommended)
# See: https://docs.npmjs.com/resolving-eacces-permissions-errors
```

## Development

For contributors who want to develop plnr locally:

```bash
# Clone the repository
git clone https://github.com/CyberBoyAyush/plnr.git
cd plnr

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Test locally
pnpm link --global
plnr
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests at [GitHub](https://github.com/CyberBoyAyush/plnr).

## License

MIT - See [LICENSE](LICENSE) for details.

## Links

- 📦 [npm Package](https://www.npmjs.com/package/plnr)
- 💻 [GitHub Repository](https://github.com/CyberBoyAyush/plnr)
- 🐛 [Report Issues](https://github.com/CyberBoyAyush/plnr/issues)
- 📚 [OpenRouter Documentation](https://openrouter.ai/docs)
- 🔍 [Exa Search](https://exa.ai/)

## Author

**Ayush Sharma**
- Email: hi@aysh.me
- GitHub: [@CyberBoyAyush](https://github.com/CyberBoyAyush)

---

**plnr** - Plan before implementation 🚀

Built with TypeScript, OpenRouter, and Exa
