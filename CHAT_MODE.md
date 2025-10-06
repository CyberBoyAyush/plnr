# 💬 Chat Mode - ContextEngine

## 🎉 New Features!

ContextEngine now has **two modes** - Chat Mode and Planning Mode!

### 🆕 What's New

**1. Chat Mode (Default)**
- Just type your question naturally
- Get conversational responses
- Context-aware answers about your project
- Quick suggestions without full plans

**2. Planning Mode**
- Use `/plan <task>` for detailed implementation plans
- Full step-by-step breakdown
- Dependencies, risks, and file changes
- Export to markdown

**3. /clear Command**
- Reset conversation and context
- Start fresh anytime
- Clears all history

---

## 📚 Usage

### Chat Mode (Default)

Just type naturally - no commands needed!

```
> How do I add authentication?

Response:
For authentication in your Express app, you can use Passport.js with JWT tokens.
Looking at your src/index.ts, you'll want to add middleware after your current
route handlers.

Suggestions:
1. Install passport and jsonwebtoken packages
2. Create auth middleware in src/middleware/
3. Add JWT validation to protected routes
```

### Planning Mode

Use `/plan` for detailed implementation plans:

```
> /plan Add JWT authentication with refresh tokens

🔍 Analyzing Codebase
📋 Implementation Plan

Summary: ...
Steps:
  1. Install Dependencies
  2. Create Auth Service
  3. Add Middleware
  ...

✓ Plan generated! Type /export to save, or continue chatting.
```

### Clear & Reset

```
> /clear

✓ Conversation cleared!
```

---

## 🎯 When to Use What

### Use Chat Mode (Default) When:
- ✅ Asking questions about the code
- ✅ Getting quick guidance
- ✅ Exploring options
- ✅ Troubleshooting issues
- ✅ Understanding patterns

**Examples:**
- "How does authentication work here?"
- "Which file handles database connections?"
- "What's the best way to add validation?"
- "Should I use TypeScript or JavaScript?"

### Use Planning Mode (`/plan`) When:
- ✅ Ready to implement a feature
- ✅ Need step-by-step instructions
- ✅ Want to export as documentation
- ✅ Need detailed file-by-file changes
- ✅ Planning large features

**Examples:**
- `/plan Add user authentication system`
- `/plan Implement caching with Redis`
- `/plan Create REST API for products`
- `/plan Add email notifications`

---

## 🔑 Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `<message>` | Chat mode | `How do I add auth?` |
| `/plan <task>` | Generate plan | `/plan Add authentication` |
| `/export` | Save current plan | `/export` |
| `/clear` | Reset everything | `/clear` |
| `/help` | Show commands | `/help` |
| `/exit` | Quit | `/exit` |

---

## 💡 Example Sessions

### Session 1: Exploration → Planning

```
ContextEngine v1.0.0

> What authentication options do I have?

Response:
For your Express + TypeScript setup, I'd recommend either Passport.js
with JWT or NextAuth.js if you add Next.js. Looking at your package.json,
you already have bcrypt which is good for password hashing.

Suggestions:
1. Use Passport.js with JWT strategy
2. Add refresh token rotation
3. Store sessions in your PostgreSQL database

> Which one is more secure?

Response:
JWT with refresh token rotation is more secure. Here's why...

> Okay, plan it out

> /plan Add JWT authentication with refresh token rotation

🔍 Analyzing Codebase
...
📋 Implementation Plan
...

✓ Plan generated! Type /export to save, or continue chatting.

> /export

✓ Plan exported to: .cengine/plan-2025-10-06.md
```

### Session 2: Quick Questions

```
> Where is the database connection defined?

Response:
Your database connection is in src/config/database.ts. It uses pg-promise
to connect to PostgreSQL with connection pooling.

> How do I add a new table?

Response:
Create a migration in src/migrations/. Based on your existing migrations,
use the format: YYYYMMDD_table_name.sql

Suggestions:
1. Create migration file
2. Define schema with constraints
3. Run migrations with npm run migrate

> /clear

✓ Conversation cleared!
```

---

## 🧠 Context Awareness

Both modes understand your project:
- ✅ **Detects your framework** (Express, Next.js, etc.)
- ✅ **Knows your files** (reads key source files)
- ✅ **Remembers conversation** (maintains history)
- ✅ **References actual code** (cites specific files)

### Context is Maintained Until:
- You use `/clear`
- You restart `cengine`
- You switch to a different project directory

---

## 🎨 Improved AI Prompts

### Chat Mode Prompt
- Conversational tone
- Concise responses (2-4 sentences)
- Quick suggestions
- File references

### Planning Mode Prompt
- Detailed breakdown
- Step-by-step instructions
- Specific code changes
- Risk analysis
- Dependency recommendations

Both modes use **grok-2-1212** for best code understanding!

---

## ⚙️ Technical Details

### Chat Mode
- **Temperature**: 0.7 (more creative)
- **Max Tokens**: 2000
- **Response**: Conversational JSON
- **Spinner**: 💬 Thinking...

### Planning Mode
- **Temperature**: 0.5 (more focused)
- **Max Tokens**: 4000
- **Response**: Structured plan JSON
- **Spinner**: 🤖 Generating implementation plan...

### Context Gathering
- Only runs **once per session**
- Analyzes up to 20 key files
- Detects framework automatically
- Reused across chat and planning

---

## 🚀 Getting Started

```bash
cengine
```

**Try these:**
1. `How does routing work in this project?`
2. `/plan Add API rate limiting`
3. `What's in src/index.ts?`
4. `/export`
5. `/clear`

---

## 💯 Best Practices

### Do:
- ✅ Start with chat to explore
- ✅ Use `/plan` when ready to implement
- ✅ `/export` plans you want to keep
- ✅ `/clear` when switching topics
- ✅ Ask follow-ups naturally

### Don't:
- ❌ Use `/plan` for simple questions
- ❌ Export every chat response
- ❌ Forget to `/clear` when changing topics
- ❌ Exit without exporting important plans

---

## 🎓 Tips

1. **Explore First**: Use chat mode to understand before planning
2. **Be Specific**: "Add JWT auth" vs "add auth"
3. **Follow Up**: Ask clarifying questions naturally
4. **Use Context**: Refer to previous answers
5. **Clear Wisely**: Only clear when starting new topics

---

**Enjoy the new chat experience!** 🎉

Try it now:
```bash
cengine
> Tell me about this project
```
