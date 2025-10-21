# plnr - Your AI-Powered Codebase Planning Assistant

[![npm version](https://badge.fury.io/js/plnr.svg)](https://www.npmjs.com/package/plnr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Think before you code. Plan before you implement.

**plnr** is an intelligent CLI tool that understands your codebase, analyzes your project structure, and generates detailed implementation plans using advanced AI. Whether you're adding a new feature, refactoring code, or conducting security audits, plnr helps you make informed decisions with AI-powered insights.

## ✨ Why plnr?

Building software is complex. Before writing a single line of code, you need to:
- Understand existing patterns and architecture
- Identify files that need changes
- Plan the implementation steps
- Consider edge cases and risks

**plnr automates this entire process**, giving you detailed, actionable plans that save hours of manual analysis.

## 🚀 Key Features

### 🧠 Intelligent Planning
- **Smart Context Gathering**: Automatically analyzes your project structure, dependencies, and framework
- **AI-Powered Plans**: Generates step-by-step implementation plans with specific file paths and code patterns
- **Todo Management**: Tracks progress with interactive todo lists that update in real-time
- **Chat & Plan Modes**: Ask questions about your codebase or generate detailed implementation plans

### 🔍 Deep Codebase Understanding
- **File Search & Analysis**: Search patterns, read files, and explore directories
- **Framework Detection**: Automatically detects Next.js, Express, React, Vue, and more
- **Dependency Awareness**: Understands your project's dependencies and suggests appropriate packages
- **Context-Aware**: Focuses only on relevant files to provide precise recommendations

### 🛡️ Security First
- **Comprehensive Security Audits**: Scan for OWASP Top 10 vulnerabilities
- **12 Vulnerability Categories**: From secrets exposure to injection vulnerabilities
- **Actionable Remediation**: Get specific fixes for each finding
- **Risk Assessment**: Prioritized findings by severity (CRITICAL, HIGH, MEDIUM, LOW)

### 🌐 Web-Enhanced Intelligence
- **Exa Search Integration**: Find up-to-date documentation and code examples
- **Context7 MCP**: Access latest library documentation and API references
- **Smart Documentation Lookup**: Automatically searches for relevant docs when needed

### 🎨 Professional Terminal Experience
- **Beautiful CLI**: Modern, colorful terminal UI with progress indicators
- **Real-time Feedback**: See exactly what the AI is analyzing as it works
- **Prompt Enhancement**: Press Ctrl+P to enhance your prompt for better results
- **File Mentions**: Reference specific files with `@` syntax for targeted analysis
- **Export to Markdown**: Save plans as structured PRD documents

### 🔧 Advanced Features
- **Dynamic Context Windows**: Automatically scales from 100K to 2M+ token contexts
- **Multi-Model Support**: Works with GPT-5, Claude 4.5, Grok, Gemini, and more via OpenRouter
- **Tool Calling**: AI can autonomously read files, search code, and gather context
- **Error Recovery**: Intelligent error handling with automatic retries and corrections

## 📦 Installation

### Quick Install

```bash
npm install -g plnr
```

### Alternative Package Managers

```bash
# Using pnpm
pnpm add -g plnr

# Using yarn
yarn global add plnr
```

## ⚡ Quick Start

### 1. Get Your API Keys

**Required:**
- **OpenRouter API Key**: [Get it here](https://openrouter.ai/)

**Optional (but recommended):**
- **Exa API Key**: [Get it here](https://exa.ai/) for web search features

### 2. Configure Environment

**Option A: Quick One-Line Setup**

Run one of these commands to set up instantly:

```bash
# For bash
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.bashrc && source ~/.bashrc

# For zsh (macOS default)
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.zshrc && source ~/.zshrc
```

Replace `sk-or-v1-xxxxx` with your actual API key.

**Option B: Manual Setup**

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.profile`):

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxx"
export EXA_API_KEY="your-exa-api-key"  # Optional
export MODEL="x-ai/grok-4-fast"  # Optional, default shown
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

### 3. Run plnr

```bash
cd your-project
plnr
```

That's it! 🎉

## 💡 Usage

### Interactive Mode

Simply run `plnr` in any project directory:

```bash
plnr
```

You'll see a beautiful interactive interface where you can chat, plan, and analyze your codebase.

### Available Commands

| Command | Description |
|---------|-------------|
| `/plan [task]` | Generate detailed implementation plan |
| `/export` | Export current plan as markdown PRD |
| `/cc` | Launch Claude Code with gathered context |
| `/codex` | Launch Codex CLI with gathered context |
| `/security-check` | Run comprehensive security audit (OWASP Top 10) |
| `/clear` | Clear conversation and start fresh |
| `/help` | Show help message with all commands |
| `/exit` | Exit plnr |

### File Mentions

Reference specific files in your queries using `@`:

```bash
❯ Explain how @src/auth.ts works
❯ /plan Add JWT authentication to @src/index.ts
❯ What does @package.json tell you about this project?
```

Supports Tab autocomplete for file paths!

### Prompt Enhancement

Get better results by enhancing your prompts with **Ctrl+P**:

```bash
❯ add github auth
  [Press Ctrl+P]
  ⚡ Enhancing prompt...
  ✓ Prompt enhanced

❯ How can I implement GitHub OAuth authentication in this codebase?
  Please analyze existing auth patterns, identify files that need
  changes, and provide a step-by-step implementation plan.
```

The AI transforms vague prompts into specific, actionable requests that get better results!

## 📚 Example Workflows

### Generate an Implementation Plan

```bash
plnr

❯ /plan Add user authentication with JWT tokens

# plnr analyzes your codebase, searches for similar patterns,
# and generates a detailed step-by-step implementation plan
```

### Security Audit

```bash
plnr

❯ /security-check

# Scans your entire codebase for:
# - Hardcoded secrets and API keys
# - SQL injection vulnerabilities
# - XSS vulnerabilities
# - Authentication weaknesses
# - And 8 more OWASP categories
```

### Chat About Your Code

```bash
plnr

❯ How does authentication currently work in this app?
❯ What patterns should I follow for adding a new API endpoint?
❯ Show me how error handling is implemented
```

### Export and Share

```bash
plnr

❯ /plan Add real-time notifications with WebSockets
❯ /export

# Saves a beautiful markdown PRD to your project folder
```

## 🎯 How It Works

### Chat Mode
1. You ask a question about your codebase
2. plnr creates a todo list for the analysis
3. AI reads relevant files and searches for patterns
4. Provides detailed, code-aware answers with specific references
5. Completes all todos before responding

### Planning Mode
1. You request a plan with `/plan [your task]`
2. plnr analyzes your project structure and dependencies
3. Searches for similar patterns in your existing code
4. Generates a detailed implementation plan with:
   - Summary and approach explanation
   - Step-by-step instructions with specific file paths
   - Code patterns to implement
   - Dependencies to add (if needed)
   - Risk assessment and mitigation strategies

### Security Mode
1. You run `/security-check`
2. plnr systematically scans for 12 vulnerability categories
3. Reads suspicious files to confirm findings
4. Reports vulnerabilities with:
   - File path and line number
   - Severity level (CRITICAL to LOW)
   - Description of the issue
   - Specific remediation steps

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | - | Your OpenRouter API key |
| `EXA_API_KEY` | ❌ No | - | Exa API key for web search (recommended) |
| `MODEL` | ❌ No | `x-ai/grok-4-fast` | AI model to use |
| `MODEL_CONTEXT_WINDOW` | ❌ No | `2000000` | Model's context window size |

### Choosing the Right Model

plnr works with any model on OpenRouter. Here are our recommendations:

**For Speed:**
```bash
export MODEL="x-ai/grok-4-fast"           # ⚡ Blazing fast, 2M context
export MODEL="anthropic/claude-haiku-4.5"      # ⚡ Optimized for code
```

**For Quality:**
```bash
export MODEL="anthropic/claude-sonnet-4.5"  # 🎯 Most accurate
export MODEL="openai/gpt-5"                 # 🎯 Great at planning
export MODEL="google/gemini-2.5-pro"        # 🎯 Excellent reasoning
```

**For Cost:**
```bash
export MODEL="x-ai/grok-4-fast"        # 💰 Budget-friendly
export MODEL="x-ai/grok-code-fast-1"      # 💰 Good value
```

See [all available models →](https://openrouter.ai/models)

### Context Window Optimization

plnr automatically optimizes for your model's context window:

- **2M+ tokens** (Grok-4): Minimal pruning, keeps 80 messages
- **500K-1.5M tokens** Moderate pruning, keeps 50 messages
- **200K-500K tokens** (GPT-5): Standard pruning, keeps 30 messages
- **<200K tokens**: Aggressive pruning for efficiency

No configuration needed - it just works! 🎯

## 🌟 Advanced Features

### Todo Management

plnr uses an intelligent todo system that:
- ✅ Creates high-level tasks at the start
- 📍 Tracks progress in real-time
- ✨ Updates the UI as todos complete
- 🎯 **Ensures all todos are completed before providing final response**

You'll see todo lists like:
```
✓ Analyze authentication patterns in codebase
✓ Search for JWT implementation examples
→ Design token refresh strategy
○ Plan database schema changes
```

### Intelligent Prompts

Built using best practices from:
- 🔵 OpenAI Codex CLI
- 🟣 Anthropic Claude Code
- 🟢 SST OpenCode

Optimized for:
- Strategic tool usage (quality over quantity)
- Clear stopping criteria
- Result-focused responses
- Maintaining tool call/result pairing for Claude models

### MCP Integration

Uses Model Context Protocol (MCP) for:
- **Context7**: Latest library documentation
- **Exa Search**: Real-time web search

### Error Recovery

Handles edge cases gracefully:
- XML format detection (Grok models)
- Tool call/result pairing (Claude models)
- Context window overflow
- API rate limiting
- Network errors

## 🛠️ Supported Frameworks

plnr automatically detects and optimizes for:

- Next.js
- React
- Vue
- Angular
- Express
- NestJS
- Fastify
- Koa
- Svelte
- SolidJS
- Astro
- Remix

And many more!

## 📁 Project Structure

```
plnr/
├── src/
│   ├── cli/              # Terminal UI and interactive input
│   ├── context/          # Codebase analysis and gathering
│   ├── planning/         # AI planning with OpenRouter
│   ├── chat/             # Chat mode implementation
│   ├── security/         # Security audit features
│   ├── tools/            # Tool definitions and handlers
│   ├── exporters/        # PRD and markdown export
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utilities and helpers
├── dist/                 # Compiled JavaScript output
└── docs/                 # Implementation documentation
```

## 🐛 Troubleshooting

### "Command not found: plnr"

```bash
# Check if installed
npm list -g plnr

# Reinstall if needed
npm install -g plnr

# Check npm global bin path is in PATH
npm config get prefix
```

### "OPENROUTER_API_KEY is required"

```bash
# Verify it's set
echo $OPENROUTER_API_KEY

# If empty, add to your shell profile
echo 'export OPENROUTER_API_KEY="sk-or-v1-xxxxx"' >> ~/.zshrc
source ~/.zshrc
```

### Permission Errors

```bash
# Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Then reinstall
npm install -g plnr
```

### Model Not Working

```bash
# Verify model is available on OpenRouter
# See: https://openrouter.ai/models

# Check your MODEL variable
echo $MODEL

# Try a different model
export MODEL="anthropic/claude-sonnet-4.5"
```

## 🚧 Development

Want to contribute? Here's how to set up for development:

```bash
# Clone repository
git clone https://github.com/CyberBoyAyush/plnr.git
cd plnr

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Test locally
pnpm link --global
plnr
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🐛 **Report bugs**: [Open an issue](https://github.com/CyberBoyAyush/plnr/issues)
2. 💡 **Suggest features**: [Start a discussion](https://github.com/CyberBoyAyush/plnr/issues)
3. 📝 **Improve docs**: Submit PRs for documentation
4. 🔧 **Fix issues**: Check out [good first issues](https://github.com/CyberBoyAyush/plnr/labels/good%20first%20issue)

Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- 📦 [npm Package](https://www.npmjs.com/package/plnr)
- 💻 [GitHub Repository](https://github.com/CyberBoyAyush/plnr)
- 🐛 [Report Issues](https://github.com/CyberBoyAyush/plnr/issues)
- 📚 [OpenRouter Docs](https://openrouter.ai/docs)
- 🔍 [Exa Search](https://exa.ai/)
- 📖 [Context7 MCP](https://context7.com/)

## 👨‍💻 Author

**Ayush Sharma**
- Email: hi@aysh.me
- GitHub: [@CyberBoyAyush](https://github.com/CyberBoyAyush)
- Website: [aysh.me](https://aysh.me)

## 🙏 Acknowledgments

Built with insights from:
- [OpenAI Codex CLI](https://github.com/openai/codex) - Prompt engineering best practices
- [Anthropic Claude Code](https://claude.ai/code) - Strategic context gathering
- [SST OpenCode](https://opencode.ai/) - Agent architecture patterns

Special thanks to:
- OpenRouter for providing unified LLM access
- Exa for semantic search capabilities
- Context7 for library documentation

---

<div align="center">

**plnr** - Think before you code 🚀

*Built with TypeScript, OpenRouter, and love*

[⭐ Star us on GitHub](https://github.com/CyberBoyAyush/plnr) | [📦 Try it now](https://www.npmjs.com/package/plnr)

</div>
