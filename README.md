# plnr - Plan Before Implementation

> AI-powered planning tool for your codebase

## What is plnr?

plnr analyzes your codebase, understands its structure, and generates detailed implementation plans for new features or changes. It's designed to work seamlessly with AI coding assistants by providing them with rich context and structured plans.

**Plan before implementation** - Make better decisions with AI-powered planning.

## Features

- 🔍 **Smart Context Gathering**: Automatically analyzes your codebase structure, dependencies, and framework
- 🤖 **AI-Powered Planning**: Generates detailed step-by-step implementation plans using OpenRouter (Grok-2)
- 📋 **PRD Export**: Export plans as structured markdown documents
- 🎨 **Beautiful CLI**: Professional terminal UI with progress indicators and spinners
- ⚡ **Fast & Efficient**: Focuses only on relevant files to avoid overwhelming context
- 👁️ **Transparent**: Shows exactly which files are being read and analyzed
- 🚀 **Real-time Feedback**: Step-by-step progress with visual indicators

## Installation

### Prerequisites

- Node.js 20+
- pnpm
- OpenRouter API key

### Global Installation

```bash
cd /path/to/plnr
pnpm install
pnpm build
pnpm link --global
```

Now you can use `plnr` from anywhere!

## Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your OpenRouter API key to `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

Get your API key from [OpenRouter](https://openrouter.ai/)

## Usage

### Interactive Mode

```bash
plnr
```

This launches an interactive UI where you can:
1. Chat about your codebase
2. Generate implementation plans with `/plan`
3. Export as PRD with `/export`
4. Hand off to Claude Code with `/cc`

### Commands

- `/plan [task]` - Generate an implementation plan
- `/export` - Export plan as markdown
- `/cc` - Launch Claude Code with context
- `/clear` - Clear conversation
- `/help` - Show help
- `/exit` - Exit plnr

## Development

### Run in Watch Mode

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Test Locally

Link the package globally and test in any project:

```bash
# In plnr directory
pnpm link --global

# Navigate to any project
cd ~/your-project
plnr

# Unlink when done
pnpm unlink --global
```

## Example Workflow

```bash
# Start plnr in your project
cd ~/my-project
plnr

# Ask questions about your code
❯ how does authentication work?

# Generate a plan
❯ /plan Add JWT authentication

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

Edit `.env` to configure:

```bash
OPENROUTER_API_KEY=your-key-here
NODE_ENV=development
DEBUG=true
```

## Troubleshooting

### Command not found: plnr

```bash
# Re-link the package
pnpm link --global

# Or check global packages
pnpm list --global
```

### TypeScript errors

```bash
# Check types without building
pnpm tsc --noEmit
```

### Watch mode not reloading

```bash
# Kill and restart
pnpm dev
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Ink (Terminal UI)](https://github.com/vadimdemedes/ink)
- [Commander.js](https://github.com/tj/commander.js)

---

**plnr** - Plan before implementation

Built with TypeScript and OpenRouter
