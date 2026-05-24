## 1. Remove zombie API

- [ ] 1.1 Delete `loadTrustModeFromDb()` function from `electron/services/agent-service.ts`. Verify zero callers via grep.

## 2. saveToolMessage touches conversation

- [ ] 2.1 In `electron/db/messages.ts`, add `touchConversation(convId)` call inside `saveToolMessage()`, matching the pattern in `saveUserMessage()` and `saveAssistantMessage()`.

## 3. emitToRenderer isDestroyed guard

- [ ] 3.1 In `electron/ipc/handlers.ts`, add `if (!win.isDestroyed())` guard inside the `BrowserWindow.getAllWindows()` loop before `win.webContents.send()`.

## 4. Import uses db layer

- [ ] 4.1 In `electron/db/messages.ts`, add `bulkInsertMessages(convId: string, msgs: ImportMessage[]): void` that wraps a prepared INSERT with a transaction. Include `is_error` column.
- [ ] 4.2 In `electron/services/conversation-service.ts`, replace the raw `db.prepare("INSERT INTO messages...")` with `bulkInsertMessages(convId, messages)`. Remove the `getDb()` import from conversation-service.
- [ ] 4.3 Remove the inline `uuid` dynamic import in conversation-service — `bulkInsertMessages` handles ID generation internally.

## 5. AppConfig cached

- [ ] 5.1 In `chat-service.sendChatMessage`, move `readConfig(projectPath)` to before `new AgentLoop(...)` and store result.
- [ ] 5.2 Add `config: AppConfig` to `AgentLoop` constructor params. In `start()`, use `this.config` (already set) instead of `this.config = readConfig(projectPath)`.
- [ ] 5.3 Remove `readConfig` import from `agent-loop.ts`.

## 6. Verification

- [ ] 6.1 Run `npx vue-tsc --noEmit`.
- [ ] 6.2 Manual test: send message with tool calls, verify conversation list sort order updates (tool message touch).
- [ ] 6.3 Manual test: import a conversation export file, verify messages load with correct `isError` preserved.
- [ ] 6.4 Manual test: quit app with multiple windows (if applicable), verify no crash from destroyed window emit.
- [ ] 6.5 Manual test: edit config.toml mid-conversation, send message — verify old config used (cache not invalidated by edit; expected behavior).
