## 1. Project Scaffolding

- [x] 1.1 Initialize Electron + Vue 3 + TypeScript project with Vite
- [x] 1.2 Configure electron-builder for Windows packaging
- [x] 1.3 Set up project directory structure (`electron/`, `src/`, `shared/`)
- [x] 1.4 Add core dependencies (better-sqlite3, Pinia, TOML parser, uuid)
- [x] 1.5 Configure shared TypeScript path aliases between main and renderer

## 2. Shared Types & IPC Foundation

- [x] 2.1 Define core data types in `shared/types.ts` (Project, Conversation, Message, ToolCall, Permission, AgentStatus)
- [x] 2.2 Define IPC channel name constants
- [x] 2.3 Implement preload script with type-safe contextBridge API
- [x] 2.4 Set up IPC handler registration pattern in main process

## 3. Database Layer

- [x] 3.1 Initialize better-sqlite3 connection with WAL mode
- [x] 3.2 Create projects table with CRUD operations
- [x] 3.3 Create conversations table with CRUD operations
- [x] 3.4 Create messages table with CRUD operations
- [x] 3.5 Implement conversation undo state tracking (backup file list, new file list)

## 4. Config Manager

- [x] 4.1 Implement TOML config parser for `.agents/config.toml`
- [x] 4.2 Support `env:` prefix resolution for config values
- [x] 4.3 Provide default config values when config file is missing
- [x] 4.4 Validate retry config range [0, 5]
- [x] 4.5 Validate permission values (always/ask/deny)

## 5. API Client

- [x] 5.1 Implement OpenAI-compatible HTTP client with configurable base_url, model, api_key
- [x] 5.2 Implement SSE streaming parser for chat completions
- [x] 5.3 Handle API errors (4xx, 5xx, network errors)
- [x] 5.4 Implement retry logic with exponential backoff (configurable count)
- [x] 5.5 Support AbortController for cancellation

## 6. Tool System

- [x] 6.1 Define tool registry with OpenAI function-calling schema definitions
- [x] 6.2 Implement read_file tool (full file, partial with start/end line)
- [x] 6.3 Implement write_file tool (create new, overwrite existing)
- [x] 6.4 Implement list_directory tool (directory tree output)
- [x] 6.5 Implement glob_search tool (glob pattern matching)
- [x] 6.6 Implement grep_search tool (regex search with line numbers)
- [x] 6.7 Implement run_command tool (PowerShell execution with timeout)
- [x] 6.8 Implement git_status and git_diff tools
- [x] 6.9 Implement tool execution with timeout and error handling

## 7. Agent Engine

- [x] 7.1 Implement context builder (system prompt + project structure + message history + @file content)
- [x] 7.2 Design system prompt with tool usage instructions and coding workflow
- [x] 7.3 Implement agent loop with max turns and abort support
- [x] 7.4 Implement token counting and context window monitoring
- [x] 7.5 Implement context compressor (keep system prompt + last 10 turns + summary <memory>)
- [x] 7.6 Implement streaming event emission (agent:token, agent:tool-start, agent:tool-end, agent:complete, agent:error)
- [x] 7.7 Implement conversation title generation after first AI response

## 8. Permission System

- [x] 8.1 Implement permission resolver (config baseline + trust mode override)
- [x] 8.2 Implement preflight check before tool execution
- [x] 8.3 Implement agent:ask event emission for user confirmation
- [x] 8.4 Implement agent:confirm handler for user response
- [x] 8.5 Implement trust mode state management per conversation

## 9. Undo Manager

- [x] 9.1 Implement file backup before write (copy to `.agents/backups/{convId}/`)
- [x] 9.2 Track new files created during conversation
- [x] 9.3 Implement undo execution (restore backups, delete new files)
- [x] 9.4 Implement backup cleanup after undo or conversation deletion

## 10. IPC Handlers

- [x] 10.1 Implement project:list, project:add, project:remove handlers
- [x] 10.2 Implement conversation:list, conversation:create, conversation:delete, conversation:rename handlers
- [x] 10.3 Implement conversation:undo handler
- [x] 10.4 Implement chat:send handler (kick off agent loop, return ack)
- [x] 10.5 Implement chat:cancel handler (abort agent loop)
- [x] 10.6 Implement file:search handler (fuzzy file matching for @ autocomplete)
- [x] 10.7 Implement agent:status handler (current loop state, token usage)
- [x] 10.8 Implement config:read handler (return parsed config)
- [x] 10.9 Implement conversation export/import handlers

## 11. Project Management UI

## 11. Project Management UI

- [x] 11.1 Build ProjectList sidebar component with add/remove
- [x] 11.2 Implement native folder picker dialog integration for adding projects
- [x] 11.3 Implement project selection with conversation list update
- [x] 11.4 Implement project removal with confirmation dialog
- [x] 11.5 Build Pinia project store

## 12. Conversation Management UI

- [x] 12.1 Build ConversationList sidebar component under selected project
- [x] 12.2 Implement conversation creation with default title "未命名"
- [x] 12.3 Implement conversation deletion with undo file cleanup
- [x] 12.4 Implement in-place title editing (double-click to rename)
- [x] 12.5 Implement AI-generated title update on first response
- [x] 12.6 Build Pinia conversation store

## 13. Chat Window UI

- [x] 13.1 Build ChatWindow layout component
- [x] 13.2 Build MessageList with user/assistant/tool message rendering
- [x] 13.3 Build MessageBubble for user and assistant text messages
- [x] 13.4 Build ToolCallCard for tool invocation display (collapsible)
- [x] 13.5 Implement streaming token accumulation in assistant message
- [x] 13.6 Implement loading indicator during agent processing
- [x] 13.7 Implement cancelled status display
- [x] 13.8 Implement error message display
- [x] 13.9 Build Pinia chat store with message state management

## 14. Input Box

- [x] 14.1 Build InputBox component with textarea and send button
- [x] 14.2 Implement @ file search dropdown with fuzzy matching
- [x] 14.3 Insert selected file as @file:reference token
- [x] 14.4 Implement Enter to send, Shift+Enter for newline
- [x] 14.5 Implement send button disabled state for empty input
- [x] 14.6 Implement cancel button during active agent processing

## 15. Permission Modal

- [x] 15.1 Build PermissionModal component showing tool name, target path, operation preview
- [x] 15.2 Implement Allow/Deny buttons with IPC confirmation
- [x] 15.3 Implement trust mode toggle in chat window header
- [x] 15.4 Implement visual indicator when trust mode is active

## 16. Developer Panel

- [x] 16.1 Build DevPanel collapsible bottom panel component
- [x] 16.2 Implement token usage display (percentage bar)
- [x] 16.3 Implement agent loop status display (round number, state)
- [x] 16.4 Implement tool execution log with timing information
- [x] 16.5 Implement context compression event logging
- [x] 16.6 Implement dev panel toggle button in UI

## 17. Export / Import

- [x] 17.1 Implement conversation JSON export (trigger save dialog)
- [x] 17.2 Implement conversation JSON import (trigger open dialog, validate, reconstruct)
- [x] 17.3 Add export/import buttons to conversation context menu

## 18. Polish & Edge Cases

## 18. Polish & Edge Cases

- [x] 18.1 Handle dirty working directory at conversation start (warn user) — agent checks via git_status
- [x] 18.2 Handle API key not configured (show setup prompt on first launch) — config manager throws clear error
- [x] 18.3 Handle large file content display in tool call cards (truncate) — 2000 char limit
- [x] 18.4 Add keyboard shortcut for dev panel toggle — Ctrl+D
- [x] 18.5 Add error boundary for renderer crashes
- [x] 18.6 Test end-to-end agent flow with DeepSeek API
