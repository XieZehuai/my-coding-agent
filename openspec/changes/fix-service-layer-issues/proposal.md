## Why

Phase 1 (ConversationRuntime) and the architecture review surfaced several small, independent issues that don't warrant individual change proposals. Bundling them keeps overhead low while addressing concrete quality issues.

## What Changes

1. **Remove zombie API** — `agent-service.loadTrustModeFromDb()` was added speculatively and has zero callers. Delete it.
2. **`saveToolMessage` should touch conversation** — `saveUserMessage` and `saveAssistantMessage` call `touchConversation` to update `updated_at` for sort order. `saveToolMessage` doesn't, causing tool-only conversation rounds to stay stale in the list.
3. **`emitToRenderer` checks `isDestroyed()`** — current implementation calls `webContents.send` on all windows without checking if any window is in a destroyed state, which can throw.
4. **`importConversationFromFile` uses db layer** — service currently writes raw SQL `INSERT INTO messages (...)`, bypassing `db/messages.ts` abstraction. New columns (like `is_error`) must be manually added to this SQL each time.
5. **AppConfig cached per send, not re-read from disk** — currently `AgentLoop.start()` calls `readConfig(projectPath)` on every message. Reads from disk and parses TOML each time. Cache per conversation lifetime.

## Capabilities

### New Capabilities
None — these are implementation fixes, not new features.

### Modified Capabilities
- `data-persistence`: `saveToolMessage` now touches conversation timestamps (consistent with user/assistant message saves)
- `data-persistence`: conversation import routes through `db/messages` bulk insert API instead of raw SQL
- `agent-state-machine`: `AgentLoop.start()` uses cached config instead of disk read per send

## Impact
- `electron/services/agent-service.ts` — remove `loadTrustModeFromDb`
- `electron/db/messages.ts` — add `touchConversation` to `saveToolMessage`, add `bulkInsertMessages` for import
- `electron/services/conversation-service.ts` — `importConversationFromFile` uses `bulkInsertMessages`
- `electron/ipc/handlers.ts` — `emitToRenderer` adds `isDestroyed()` guard
- `electron/services/agent-loop.ts` — `this.config` loaded once, not per `start()`
- `electron/services/chat-service.ts` — `readConfig` called once, config passed to AgentLoop constructor
