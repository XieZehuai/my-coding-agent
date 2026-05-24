## Context

Five independent small fixes identified during architecture review and Phase 1 verification. Each is isolated, low-risk, and improves correctness or maintainability.

## Decisions

### Decision 1: `touchConversation` in `saveToolMessage` — which arguments?

Currently `touchConversation(id)` takes a convId and updates `updated_at = Date.now()`. `saveToolMessage` already receives `convId` as its first parameter — just add the call before returning.

### Decision 2: `bulkInsertMessages` API shape

Function signature: `bulkInsertMessages(convId: string, messages: Array<{ role, content, reasoningContent?, toolCalls?, toolCallId?, isError?, createdAt? }>): void`.

Uses a prepared statement inside a transaction (matching the current import pattern). Service layer gains no SQL knowledge; db layer encapsulates the INSERT shape including `is_error`.

### Decision 3: `isDestroyed` check placement

```ts
for (const win of BrowserWindow.getAllWindows()) {
  if (!win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}
```

Single-line guard. Zero performance cost.

### Decision 4: AppConfig cache strategy

`chat-service.sendChatMessage` already calls `readConfig(projectPath)` — move it from `AgentLoop.start()` to there. Store in `AgentRunOptions` or as a new constructor param. AgentLoop receives config as an immutable input, no longer reading disk.

## Risks

- **[Risk] Cached config stale if user edits config.toml mid-session.** Mitigation: user must restart app or reload project to pick up new config. This is actually *better* than per-message re-read (which creates variable behavior within a conversation). Phase 1 design noted this should be explicit; this fix makes it explicit.

- **[Risk] `bulkInsertMessages` introduces untested codepath for import.** Mitigation: import is already manually tested (Phase 1 9.x verification implicitly covers it). The new function has the same SQL shape as the old inline INSERT.
