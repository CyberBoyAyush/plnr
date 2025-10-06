# Quick Start Guide

## ✅ Installation Complete!

Your CLI tool `cengine` is now built and linked globally. You can use it from any directory.

## 📋 Before Using

1. **Set up your API key**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your OpenRouter API key**:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

   Get your API key from: https://openrouter.ai/

## 🚀 Usage

### Basic Usage
```bash
cengine "your task description"
```

### Examples

**Example 1: Add Authentication**
```bash
cd ~/your-project
cengine "add JWT authentication with refresh tokens"
```

**Example 2: Create API Endpoints**
```bash
cd ~/your-api-project
cengine "create REST endpoints for user CRUD operations"
```

**Example 3: Add Database Integration**
```bash
cd ~/your-app
cengine "integrate PostgreSQL with Prisma ORM"
```

## 📁 Output

The tool will:
1. ✅ Analyze your codebase
2. ✅ Generate a detailed implementation plan
3. ✅ Display the plan in your terminal
4. ✅ Automatically export it as a markdown file in `.cengine/plan-{timestamp}.md`

## 🧪 Testing on External Projects

### Test on a Node.js/Express project:
```bash
# Navigate to any project
cd ~/my-express-api

# Run cengine
cengine "add rate limiting middleware"
```

### Test on a Next.js project:
```bash
cd ~/my-nextjs-app
cengine "add user dashboard with data visualization"
```

### Test on a React project:
```bash
cd ~/my-react-app
cengine "implement dark mode toggle"
```

## 🔧 Development Mode

If you want to make changes to the tool:

```bash
# Go back to the cengine directory
cd /Users/ayush/Coding/test/cengine

# Make your changes, then rebuild
pnpm build

# The changes will be reflected immediately (since it's linked globally)
```

## 🎯 Uninstalling

To unlink the tool from global:
```bash
cd /Users/ayush/Coding/test/cengine
pnpm unlink --global
```

## 🐛 Troubleshooting

### API Key Error
```
Error: OPENROUTER_API_KEY is required
```
**Solution**: Make sure you've created `.env` file in the project you're running cengine from, OR set it globally:
```bash
export OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Command Not Found
```
command not found: cengine
```
**Solution**: Re-link the package:
```bash
cd /Users/ayush/Coding/test/cengine
pnpm link --global
```

## 📚 Features

- ✅ Automatic framework detection (Next.js, Express, React, etc.)
- ✅ Smart file filtering (only analyzes relevant files)
- ✅ Structured implementation plans with steps
- ✅ Dependency recommendations
- ✅ Risk analysis
- ✅ Markdown PRD export

## 💡 Tips

1. **Be specific with your task description** - The more details you provide, the better the plan
2. **Run from the project root** - Make sure you're in the root directory of your project
3. **Review the plan** - Always review the generated plan before implementing
4. **Save the PRD** - Plans are saved in `.cengine/` directory for future reference

---

🎉 You're all set! Try running `cengine "add user authentication"` in any project to see it in action.
