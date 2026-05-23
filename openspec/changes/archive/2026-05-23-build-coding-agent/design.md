## Context

Building a Windows desktop coding agent from scratch using Electron + Vue 3 + TypeScript. The app lets users chat with AI to analyze code, make modifications, run commands, and manage git — all within the context of a local project folder. AI backend is any OpenAI-compatible API (DeepSeek initially). No existing codebase; greenfield project.

## Goals / Non-Goals

**Goals:**
- Desktop app with project-based conversation management
- AI agent loop with streaming responses and tool execution
- File system and PowerShell integration on Windows
- Configurable permission system with trust mode override
- Per-conversation undo capability
- OpenAI-compatible API with swappable backend

**Non-Goals:**
- Cross-platform support (Windows only for v1)
- Built-in code editor or diff viewer (chat-only UI)
- Multi-user or cloud sync
- Memory system based on markdown (deferred)
- Image/file drag-and-drop input (deferred)

## Decisions

### 1. Electron over Tauri

**Rationale**: The developer is proficient in TypeScript/Node.js but not Rust. Electron eliminates the language boundary between frontend and backend, allowing shared TypeScript types and a unified toolchain. The larger bundle size is acceptable for a developer tool.

### 2. Agent Loop in Main Process

**Rationale**: The main process has direct access to Node.js APIs (fs, child_process, SQLite). Running the agent loop here keeps the API key secure (never exposed to renderer) and avoids contextBridge serialization overhead for large file contents. The loop is I/O-bound (API calls, file operations), not CPU-bound, so it won't block the event loop.

**Alternatives considered**: Worker thread (adds complexity without benefit for I/O-bound work), renderer process (exposes API key, can't access Node.js APIs directly).

### 3. OpenAI-Compatible API Client

**Rationale**: Hardcoding DeepSeek limits future flexibility. An OpenAI-compatible client supports DeepSeek, OpenAI, Ollama, Groq, LM Studio, and any self-hosted model serving the `/v1/chat/completions` endpoint. Configuration via `.agents/config.toml`:

```toml
[api]
base_url = "https://api.deepseek.com/v1"
api_key = "env:DEEPSEEK_API_KEY"   # "env:" prefix reads from process.env
model = "deepseek-chat"
retry = 3                          # [0, 5], 0 = no retry
```

### 4. IPC Architecture

**Request/Response** (ipcMain.handle + ipcRenderer.invoke): For CRUD operations (projects, conversations, file search, status queries).

**Event Streaming** (webContents.send + ipcRenderer.on): For agent output — tokens, tool calls, errors, permission asks. The chat:send invoke returns immediately with an acknowledgment; all subsequent output streams via events.

```
Renderer                            Main
  │──── chat:send ──────────────────▶│
  │◀─── resolve (ack) ───────────────│
  │◀─── agent:token ─────────────────│  (streaming)
  │◀─── agent:tool-start ────────────│
  │◀─── agent:tool-end ──────────────│
  │◀─── agent:ask ───────────────────│  (permission needed)
  │──── agent:confirm ───────────────▶│
  │◀─── agent:complete ──────────────│
```

### 5. SQLite via better-sqlite3

**Rationale**: Synchronous API is ideal for the main process (no async overhead for local DB). Lightweight, zero-config, single-file database. Schema is simple (projects, conversations, messages) and won't require migration complexity.

### 6. Undo via File Backup

**Rationale**: Per-conversation file backup is simpler and more predictable than git-based undo. Before each write_file, the original content is backed up to `.agents/backups/{convId}/`. New files are tracked (no backup). Undo restores originals and deletes new files. Git integration is reserved for user-initiated operations (git status, git diff tools).

### 7. Permission System with Two Layers

**Layer 1 — Config file** (`.agents/config.toml`): Baseline permissions per operation type (always/ask/deny).

**Layer 2 — Trust mode toggle**: Per-conversation UI toggle that temporarily overrides all to "always". Turning it off returns to config baseline. Visual indicator required when trust mode is active.

```
resolve(operation):
  if trustMode: return "always"
  return config.permissions[operation]  // "always" | "ask" | "deny"
```

### 8. Agent Loop Design

```
while turn < MAX_TURNS:
  build messages (system prompt + history + tool results)
  if token_count > 90%: compress context
  
  send to API (streaming)
  parse response tokens
  
  if has tool_calls:
    for each tool_call:
      check permission → execute or ask user
      append tool_result to messages
  else:
    break → complete
```

Max turns: 10. Timeout: 60s per API call, 120s per command execution.

### 9. Streaming Token Delivery

Main process reads SSE from the API and forwards each delta token to the renderer via `agent:token` event. The renderer accumulates tokens into the current assistant message. Tool calls are detected when the API returns `finish_reason: "tool_calls"` — at that point the accumulated content is the assistant's text, and tool execution begins.

### 10. Context Compression Strategy

Trigger: token count exceeds 90% of context window.

1. Keep system prompt + last 10 message turns
2. If still > 70%: invoke AI to summarize truncated messages
3. Insert summary as `<memory>` block after system prompt for all subsequent turns

### 11. @File Reference

Typing `@` in the input box triggers a file search. The renderer calls `file:search` IPC which performs fuzzy matching against project files. Selecting a file inserts a `@file:relative/path` token. On send, the main process resolves @file references and includes the file contents in the context before the user message.

### 12. Conversation Title Generation

After the first complete assistant response, the main process makes a lightweight API call: "请用 15 字以内总结这段对话". The result is saved as the conversation title. The user can rename at any time.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agent loop writes incorrect code silently | Permission is "ask" by default; user must confirm each write |
| PowerShell execution could be dangerous | Commands run with timeout; permission defaults to "ask" |
| Context window overflow | Auto-compression at 90%; max turns limit of 10 |
| API key stored in environment variable only, forgetting to set it causes failures | App checks for key at startup and shows clear error |
| Undo backed by file copies, not git | Acceptable for v1; git integration available as separate tool |
| Single platform (Windows) limits audience | Explicit v1 scope; cross-platform deferred |
| Large file writes could be slow | Streaming writes not needed for typical code files; acceptable |
