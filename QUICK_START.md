# ⚡ Quick Start - ContextEngine Interactive Mode

## 🚀 Ready to Use!

Your CLI tool is now ready with a beautiful interactive UI!

### Start Interactive Mode

```bash
cengine
```

That's it! You'll see:

```
  ██████╗███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗
 ██╔════╝██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝
 ██║     █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗
 ██║     ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝
 ╚██████╗███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗
  ╚═════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
                                     v1.0.0

You are standing in an open terminal. An AI awaits your commands.

ENTER to send • \ + ENTER for a new line • @ to mention files

Model: x-ai/grok-code-fast-1 (via OpenRouter)

> _
```

## 📝 Example Usage

### 1. Generate Your First Plan

```
> Add user authentication with JWT tokens
```

**What happens:**
- 🔍 Scans your codebase
- 📦 Detects language & framework
- 📄 Reads key files
- 🤖 AI generates detailed plan
- 📋 Displays plan in terminal

### 2. Review the Plan

The complete implementation plan is shown with:
- Summary
- Step-by-step instructions
- Files to modify/create
- Dependencies to add
- Risk analysis

### 3. Export When Ready

```
> /export
```

Saves to: `.cengine/plan-{timestamp}.md`

### 4. Generate Another Plan

```
> Add email notification system
```

**No restart needed!** Generate multiple plans in one session.

### 5. Exit

```
> /exit
```

Or press `Ctrl+C`

## 🎯 Quick Commands

| Command | Action |
|---------|--------|
| `<your task>` | Generate a plan |
| `/export` | Save current plan |
| `/help` | Show commands |
| `/exit` | Exit ContextEngine |
| `?` | Quick help |

## 💡 Pro Tips

1. **Be Specific**: "Add JWT auth with refresh tokens" vs "add auth"
2. **Review First**: Always review before exporting
3. **Multiple Plans**: Generate several plans, export the best one
4. **Project Context**: Run from your project root directory

## 🔧 Requirements

Before using:
1. ✅ OpenRouter API key in `.env` or environment
2. ✅ Run from project directory
3. ✅ Internet connection for AI

## 📁 File Structure

Plans are saved to:
```
your-project/
├── .cengine/
│   ├── plan-2025-10-06T10-30-00.md
│   ├── plan-2025-10-06T11-15-00.md
│   └── ...
└── ...
```

## 🎨 What You Get

### Beautiful UI
- ASCII art branding
- Color-coded output
- Progress indicators
- Real-time feedback

### Transparent Process
- See which files are read
- Watch AI progress
- Model information shown
- Clear success/error messages

### Smart Planning
- Context-aware suggestions
- Framework-specific advice
- Dependency recommendations
- Risk analysis included

## 🐛 Troubleshooting

### API Key Error
```bash
# Set environment variable
export OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Or create .env in project
echo "OPENROUTER_API_KEY=sk-or-v1-xxxxx" > .env
```

### Command Not Found
```bash
cd /Users/ayush/Coding/test/cengine
pnpm link --global
```

### React Error
```bash
pnpm install
pnpm build
pnpm link --global
```

## 🎉 You're All Set!

Try it now:
```bash
cengine
```

Type your first task and watch the magic happen! ✨

---

**Need Help?**
- Type `/help` in the CLI
- Read `INTERACTIVE_MODE.md` for details
- Check `README.md` for full documentation
