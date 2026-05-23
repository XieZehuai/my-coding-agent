## Why

Build a Windows desktop coding agent application that lets users interact with AI to gather requirements, write design docs, modify code, review code, and execute commands — all within the context of a local project folder. Existing solutions (like Cursor or Copilot Chat) are either tied to specific editors or lack deep file system integration. This app provides a standalone chat-first coding agent experience powered by any OpenAI-compatible API (starting with DeepSeek).

## What Changes

- New Electron desktop application from scratch
- Vue 3 + TypeScript frontend with a three-panel layout (project list, conversation list, chat window)
- Node.js main process hosting the agent engine, tool registry, and SQLite database
- OpenAI-compatible API client supporting DeepSeek and swappable to any compatible provider
- Agent loop with streaming responses, function calling, and tool execution
- File system tools (read, write, list, glob, grep) integrated with PowerShell for Windows
- Permission system configurable via `.agents/config.toml` with support for trust mode toggle
- Per-conversation undo tracking for reverting file changes
- Context compression when approaching token limits
- Conversation export/import in JSON format
- Developer panel for monitoring token usage, agent status, and tool logs

## Capabilities

### New Capabilities

- `project-management`: Add projects by selecting a local folder, remove projects, switch between projects. Project name derived from folder name.
- `conversation-management`: Create conversations within a project (default title "未命名"), delete conversations, rename conversations, list conversations sorted by time.
- `agent-chat`: Send messages to AI, receive streaming token-by-token responses, cancel in-progress requests, automatic conversation title generation via AI after first response, @file reference autocomplete.
- `tool-system`: AI-invoked tools for file I/O (read, write, list directory, glob search, grep search), PowerShell command execution with timeout, git operations (status, diff).
- `permission-system`: Read `.agents/config.toml` for permission policies (always/ask/deny per operation type), trust mode toggle to temporarily override to always-allow, confirmation modal for ask-level operations.
- `data-persistence`: SQLite storage for projects, conversations, and messages. Per-conversation undo tracking (file backup/restore). Conversation export/import in JSON format.
- `dev-panel`: Monitor agent loop status, token usage, context window fill percentage, recent tool execution logs. Automatic context compression when token usage exceeds 90%.

### Modified Capabilities

None — this is a greenfield project.

## Impact

- New Electron application with primary code in `electron/` (main process) and `src/` (renderer process)
- Dependencies: Electron, Vue 3, TypeScript, better-sqlite3, Vite, Pinia, TOML parser
- No existing code or APIs affected
- Windows-only target platform, PowerShell for system interaction
- `.agents/` directory introduced in project folders for configuration
