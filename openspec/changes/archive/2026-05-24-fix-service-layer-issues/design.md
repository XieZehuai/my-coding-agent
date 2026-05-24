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

`chat-service.sendChatMessage` already calls `readConfig(projectPath)` — move it from `AgentLoop.start()` to there. Store as a constructor param. AgentLoop receives config as an immutable input.

### Decision 5 (added during implementation): `max_turns` placed under `[agent]` TOML section

Previously `max_turns` was the only top-level key in config.toml (no `[]` section). Moved under `[agent]`:

```toml
[agent]
max_turns = 50
```

Updated parsing (`config.ts` reads `parsed.agent.max_turns`), default generation (`generateDefaultConfig`), and key-merge logic (`getMissingKeys`). Removed the `globalDefaults` concept from `getMissingKeys` — all config keys now live in a section. Removed debug `console.log` statements from config.ts.

## Risks

- **[Risk] Cached config stale if user edits config.toml mid-session.** Same as before.
- **[Risk] Old config.toml files with top-level `max_turns` are silently ignored.** The parser only reads `[agent].max_turns`. Users with existing config.toml files must move `max_turns = 50` under `[agent]`. Running `/config` built-in command regenerates with new format.
