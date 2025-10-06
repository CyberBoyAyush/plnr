# ContextEngine

AI-powered planning layer for coding agents like Claude Code and Cursor.

## What is ContextEngine?

ContextEngine analyzes your codebase, understands its structure, and generates detailed implementation plans for new features or changes. It's designed to work seamlessly with AI coding assistants by providing them with rich context and structured plans.

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
cd /path/to/contextengine
pnpm install
pnpm build
pnpm link --global
```

Now you can use `cengine` from anywhere!

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
cengine
```

This launches an interactive UI where you can:
1. Enter your task description
2. View the generated plan
3. Export as PRD or integrate with Claude Code

### Quick Plan Mode

```bash
cengine plan "add user authentication with JWT"
```

This generates a plan and displays it in the terminal.

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
# In contextengine directory
pnpm link --global

# Navigate to any project
cd ~/your-project
cengine plan "your task"

# Unlink when done
pnpm unlink --global
```

## Testing on External Projects

1. **Build and link** the tool:
```bash
cd /path/to/contextengine
pnpm build
pnpm link --global
```

2. **Navigate to any project**:
```bash
cd ~/my-express-api
```

3. **Run ContextEngine**:
```bash
cengine plan "add rate limiting middleware"
```

4. **View the generated plan** and optionally export it:
```bash
# Plans are saved to .cengine/plan-{timestamp}.md
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
contextengine/
├── src/
│   ├── cli/           # Terminal UI and output formatting
│   ├── context/       # Codebase analysis and file reading
│   ├── planning/      # AI planning logic
│   ├── exporters/     # PRD generation
│   ├── types/         # TypeScript definitions
│   └── utils/         # Utilities
├── dist/              # Compiled output
└── .cengine/          # Generated plans (gitignored)
```

## Configuration

Edit `.env` to configure:

```bash
OPENROUTER_API_KEY=your-key-here
NODE_ENV=development
DEBUG=true
```

## Examples

### Example 1: Add Authentication

```bash
cengine plan "add JWT authentication with refresh tokens"
```

### Example 2: API Endpoints

```bash
cengine plan "create REST API endpoints for user management"
```

### Example 3: Database Integration

```bash
cengine plan "integrate PostgreSQL with Prisma ORM"
```

## Troubleshooting

### Command not found: cengine

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

Built with ❤️ using TypeScript, Ink, and OpenRouter
