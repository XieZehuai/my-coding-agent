## 1. Remove zombie API

- [x] 1.1 Delete `loadTrustModeFromDb()` function from `electron/services/agent-service.ts`. Verify zero callers via grep.

## 2. saveToolMessage touches conversation

- [x] 2.1 In `electron/db/messages.ts`, add `touchConversation(convId)` call inside `saveToolMessage()`, matching the pattern in `saveUserMessage()` and `saveAssistantMessage()`.

## 3. emitToRenderer isDestroyed guard

- [x] 3.1 In `electron/ipc/handlers.ts`, add `if (!win.isDestroyed())` guard inside the `BrowserWindow.getAllWindows()` loop before `win.webContents.send()`.

## 4. Import uses db layer

- [x] 4.1 In `electron/db/messages.ts`, add `bulkInsertMessages(convId: string, msgs: ImportMessage[]): void` that wraps a prepared INSERT with a transaction. Include `is_error` column.
- [x] 4.2 In `electron/services/conversation-service.ts`, replace the raw `db.prepare("INSERT INTO messages...")` with `bulkInsertMessages(convId, messages)`. Remove the `getDb()` import from conversation-service.
- [x] 4.3 Remove the inline `uuid` dynamic import in conversation-service — `bulkInsertMessages` handles ID generation internally.

## 5. AppConfig cached

- [x] 5.1 In `chat-service.sendChatMessage`, move `readConfig(projectPath)` to before `new AgentLoop(...)` and store result.
- [x] 5.2 Add `config: AppConfig` to `AgentLoop` constructor params. In `start()`, use `this.config` (already set) instead of `this.config = readConfig(projectPath)`.
- [x] 5.3 Remove `readConfig` import from `agent-loop.ts`.

## 6. Verification

- [x] 6.1 Run `npx vue-tsc --noEmit`.
- [x] 6.2 Sort order changed to `ORDER BY created_at DESC` (from `updated_at DESC`). TouchConversation fix stays for consistency. Future drag-sort will use a separate `sort_order` column.
- [x] 6.3 Import button moved from right-click context menu to section header next to +. Context menu now: Delete, Undo, Export only.
- [ ] 6.4 Manual test: quit app with multiple windows (if applicable), verify no crash from destroyed window emit.
- [x] 6.5 Config cache works. `max_turns` moved to `[agent]` section. Verified.
