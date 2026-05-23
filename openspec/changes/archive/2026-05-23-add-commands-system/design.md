## Context

The Coding Agent already supports free-form chat with AI. Users frequently repeat the same workflows (git commits, project setup, etc.). A slash-command system allows both built-in utilities and user-defined prompt templates, accessible via `/command` in the chat input.

## Goals / Non-Goals

**Goals:**
- Built-in `/config` command to bootstrap `.agents/config.toml`
- User-defined commands via `.agents/commands/<name>/COMMAND.md`
- `/` autocomplete in the chat input box
- Command interception before the agent loop starts

**Non-Goals:**
- Command chaining or piping (e.g., `/cmd1 | /cmd2`)
- Command arguments with named parameters (just free text after `/cmd`)
- UI-based command editor (edit `COMMAND.md` directly)

## Decisions

### 1. Two-tier command resolution

Built-in commands are resolved first. If no match, the system checks `.agents/commands/<name>/` for a `COMMAND.md` file. If neither matches, the raw text is sent to the AI.

```
/resolve(command):
  if builtin.has(command) → execute locally, return result
  if fs.exists(.agents/commands/<command>/COMMAND.md) → inject as system prompt
  else → send raw text to AI
```

**Rationale**: Built-in commands need local execution (e.g., creating files). Custom commands are prompt templates — the AI does the work, the COMMAND.md just guides it.

### 2. Built-in commands execute synchronously

Built-in commands run in the main process and return results as assistant messages (saved to DB, emitted as `agent:token` events). No agent loop is started.

**Rationale**: Built-in commands are file operations that don't need AI. Returning results via the streaming event system reuses the existing frontend display pipeline.

### 3. Custom commands inject COMMAND.md as a system message

The entire content of `COMMAND.md` is prepended as a system-level message before the regular system prompt. The user's additional text after `/cmd` is preserved as the user message.

```
User input: "/git-commit 用中文写 commit message"
Result:
  system: <COMMAND.md content>
  system: <regular system prompt>
  user: 用中文写 commit message
```

**Rationale**: System messages have the highest priority in LLM context. The AI sees the command instructions first, then the project context, then the user's specific request.

### 4. `max_turns` moved to config.toml

Previously hardcoded at 10 in `agent-service.ts`. Now read from `config.maxTurns` with a default of 50. Parsed from the top-level `max_turns` key in config.toml.

**Rationale**: Different projects need different turn limits. Simple refactors might need 5 turns; complex multi-file changes might need 50.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Malicious `COMMAND.md` could instruct AI to run dangerous commands | AI still respects permission config (write/execute = ask by default) |
| `/` prefix conflicts with natural language that starts with `/` | Users must explicitly send `/` text; if no command matches, it's sent to AI as-is |
| Custom commands have no validation | Users are developers who understand the prompt format; errors surface naturally |
