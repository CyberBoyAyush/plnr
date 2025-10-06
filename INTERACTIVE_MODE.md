# 🎮 Interactive Mode - ContextEngine

## 🚀 What's New

ContextEngine now features a **beautiful interactive terminal UI** inspired by modern AI assistants!

### Before vs After

**Before:**
```bash
cengine "add authentication"  # One-shot command
```

**Now:**
```bash
cengine                       # Interactive session!
```

## ✨ Features

### 1. Beautiful ASCII Art Banner
```
  ██████╗███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗
 ██╔════╝██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝
 ██║     █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗
 ██║     ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝
 ╚██████╗███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗
  ╚═════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
                                     v1.0.0
```

### 2. Interactive Input
- Type your task directly
- Get immediate feedback
- See progress in real-time
- No need to restart for new tasks

### 3. Model Information
Shows which AI model is being used:
```
Model: x-ai/grok-2-1212 (via OpenRouter)
```

### 4. Command System
- `/export` - Save current plan to markdown
- `/help` - Show available commands
- `/exit` - Exit ContextEngine

### 5. Smart Export
Plans are **NOT auto-exported** anymore. You control when to save:
1. Generate a plan (just type your task)
2. Review the plan in the terminal
3. Type `/export` when ready to save

## 🎯 Usage

### Starting Interactive Mode

```bash
cengine
```

### Example Session

```
> Add user authentication with JWT

🔍 Analyzing Codebase
...
📋 Implementation Plan
...
✓ Plan generated! Type /export to save as markdown, or enter a new task.

> /export
✓ Plan exported to: .cengine/plan-2025-10-06.md

> Add rate limiting to API endpoints
...

> /exit
✓ Goodbye! 👋
```

### Multiple Tasks in One Session

```bash
cengine

> add authentication
# Review plan...

> add email notifications
# Review plan...

> /export
# Exports the last plan

> implement dark mode
# Review plan...

> /exit
```

## 🎨 UI Features

### Visual Hierarchy
- **Cyan** - Branding and headers
- **Yellow** - Model info
- **Gray** - Hints and secondary text
- **Green** - Success messages
- **Blue** - Progress indicators

### User Guidance
```
You are standing in an open terminal. An AI awaits your commands.

ENTER to send • \ + ENTER for a new line • @ to mention files
```

### Command Hints
```
? for help                  GHOSTTY ∆ | MCP ✓

Commands:
  /export  - Export the current plan as markdown
  /help    - Show available commands
  /exit    - Exit ContextEngine
```

## 📊 Workflow

### 1. Launch
```bash
cengine
```

### 2. Enter Task
```
> Add user authentication system
```

### 3. Watch Progress
```
🔍 Analyzing Codebase
📦 Detected: TypeScript, Express, 42 packages
📄 Reading key files...
🤖 AI is analyzing your codebase...
✓ AI analysis complete
```

### 4. Review Plan
```
📋 Implementation Plan

Summary: ...
Steps: ...
Dependencies: ...
```

### 5. Export (Optional)
```
> /export
✓ Plan exported to: .cengine/plan-2025-10-06.md
```

### 6. Continue or Exit
```
> another task
# OR
> /exit
```

## 💡 Tips

1. **No Auto-Export**: Plans are only saved when you type `/export`
2. **Multiple Tasks**: Generate multiple plans in one session
3. **Review First**: Always review the plan before exporting
4. **Quick Exit**: Type `/exit` or use Ctrl+C
5. **Get Help**: Type `/help` or `?` for commands

## 🔧 Technical Details

### Built With
- **Ink** - Terminal UI framework (React for CLI)
- **React** - Component-based UI
- **Chalk** - Terminal colors
- **Ora** - Loading spinners

### Architecture
```
src/
├── cli/
│   └── ui.tsx          # Interactive UI component
├── index.tsx           # Main entry with Ink render
└── ...                 # Other modules
```

### Component Flow
```
index.tsx (render)
    ↓
ui.tsx (interactive UI)
    ↓
onCommand handler
    ↓
Context → AI → Display → Export (on demand)
```

## 🆚 Comparison

| Feature | Before | Now |
|---------|--------|-----|
| Mode | One-shot | Interactive |
| Multiple tasks | Restart each time | One session |
| Export | Auto | On demand (`/export`) |
| Branding | Simple text | ASCII art |
| Model info | Hidden | Displayed |
| Commands | None | `/export`, `/help`, `/exit` |
| UX | Basic | Professional |

## 🚀 What's Next

Potential enhancements:
- Model switching (`/model grok-2`)
- File selection (`@file.ts`)
- Plan editing
- History navigation (↑/↓ arrows)
- Multi-line input (\\ + Enter)
- Plan comparison
- Template system

---

**Enjoy the new interactive experience!** 🎉

Try it now:
```bash
cengine
```
