## Phase Overview

This change implements **Phase 1** only. Phases 2–5 are listed for context with `(separate change)` markers — each will receive its own proposal when scheduled.

```
Phase 1: ConversationRuntime + Registry          ← this change
Phase 2: Extract TitleGenerator                   (separate change)
Phase 3: Extract StreamRunner                     (separate change)
Phase 4: Extract ToolExecutor                     (separate change)
Phase 5: Extract StatusReporter + Compressor      (separate change)
```

After Phase 1, `AgentLoop` is functionally unchanged but receives a `ConversationRuntime` reference instead of importing module globals. This is the minimum viable change that unlocks subsequent extractions.

---

## 1. Foundation: types and module skeleton

- [x] 1.1 Create `electron/services/conversation-runtime.ts` with `ConversationRuntime` class skeleton: `convId`, `disposed`, `controller`, `status`, `pendingAsks`, `skills` fields. Add `dispose()`, `isDisposed()` methods.
- [x] 1.2 In `conversation-runtime.ts`, add `abortCurrent()`, `registerAsk(askId, resolve)`, `resolveAsk(askId, approved)`, `rejectAllAsks()`, `updateStatus(snapshot)`, `setSkillsCache(skills)` methods.
- [x] 1.3 Create `electron/services/conversation-registry.ts` with `ConversationRegistry` class: `runtimes: Map<convId, ConversationRuntime>`, `get(convId)`, `dispose(convId)`, `disposeAll()`. Export singleton `conversationRegistry`.
- [x] 1.4 Update `electron/main.ts` `before-quit` handler: call `conversationRegistry.disposeAll()` before `closeDb()`.

## 2. Migrate `convStatus` and `convTrustMode` reads

- [x] 2.1 In `agent-service.getAgentStatus(convId)`: change `convStatus.get(convId)` → `conversationRegistry.get(convId).status`.
- [x] 2.2 Decide trust-mode policy: per design.md Decision 1, trust mode is consulted from `Conversation` row at agent-start time. Remove `convTrustMode` Map usage in `agent-loop.ts:223` — read trust from `Conversation` via `getConversationTrustMode(convId)` once per `start()` and store in `AgentContext.trustMode`.
- [x] 2.3 In `agent-service.setTrustMode(convId, enabled)`: keep the DB write (`setConversationTrustMode`); remove the `convTrustMode.set(...)` line (the Map is now dead).
- [x] 2.4 In `chat-service.sendChatMessage`: remove `convTrustMode.set(convId, trustMode)` (the value is now read from DB at agent-start time, not pushed in via the trustMode parameter; instead, `chat-service` writes via `setConversationTrustMode` if trustMode differs from DB, or accepts the existing DB value).

## 3. Migrate `pendingConfirmations` to runtime-local

- [x] 3.1 Update `shared/types.ts`: no type change needed for `IPC.AGENT_CONFIRM` channel name, but document the new payload shape in a comment near `EVENT_ASK`.
- [x] 3.2 Update `electron/preload.ts` `confirmAsk` signature: `(convId: string, askId: string, approved: boolean) => ipcRenderer.invoke(IPC.AGENT_CONFIRM, convId, askId, approved)`.
- [x] 3.3 Update `electron/ipc/register.ts` `AGENT_CONFIRM` handler: accept `(convId, askId, approved)`; call `resolveConfirmation(convId, askId, approved)`.
- [x] 3.4 Update `agent-service.resolveConfirmation(convId, askId, approved)`: route through `conversationRegistry.get(convId).resolveAsk(askId, approved)`. Remove the global `pendingConfirmations` Map usage.
- [x] 3.5 Update `agent-loop.ts` `waitForConfirmation`: replace `pendingConfirmations.set(askId, ...)` with `this.runtime.registerAsk(askId, finish)`. Remove import of `pendingConfirmations` from `agent-shared`.
- [x] 3.6 Update `src/composables/useAgent.confirmAsk` callsite: pass `convId` as first argument. Pull convId from the closure already established in `setupListeners(convId)`.
- [x] 3.7 Update `src/components/chat/PermissionModal.vue` (or wherever `confirmAsk` is invoked from): ensure `convId` is available and passed.

## 4. Migrate `agentControllers` to runtime

- [x] 4.1 In `chat-service.sendChatMessage`: replace `agentControllers.set(convId, ac)` with `conversationRegistry.get(convId).controller = ac`. The lazy-get also creates the runtime if absent.
- [x] 4.2 In `chat-service.sendChatMessage` `.finally()`: replace `agentControllers.delete(convId)` with clearing `runtime.controller = null` (but do not dispose the runtime; runtime survives across multiple sends).
- [x] 4.3 In `chat-service.cancelChat(convId)`: replace `agentControllers.get(convId)?.abort()` with `conversationRegistry.get(convId).abortCurrent()`.
- [x] 4.4 Remove `const agentControllers` declaration at top of `chat-service.ts`.

## 5. Migrate `conversationSkills` (skill-tracker.ts → runtime)

- [x] 5.1 In `conversation-runtime.ts`, add the `skills: TrackedSkill[]` field with default `[]`, and methods `addSkill(name)`, `getSkillsContent(projectPath, resolveSkillFn)`, `clearSkills()`.
- [x] 5.2 Move the lazy-resolve logic from `skill-tracker.get(convId, projectPath)` into `runtime.getSkillsContent(projectPath, resolveSkill)`. The runtime depends on a callback (passed in by service layer) for `resolveSkill`, keeping runtime free of `skill-service.ts` import.
- [x] 5.3 Update `chat-service.sendChatMessage`: replace `skillTracker.add(convId, name)` with two calls — `conversationRegistry.get(convId).addSkill(name)` AND `saveConversationSkill(convId, name)` (the existing DB call). Decision 1 double-write pattern.
- [x] 5.4 Update `agent-loop.start()`: replace `skillTracker.get(convId, projectPath)` with `this.runtime.getSkillsContent(projectPath, resolveSkill)`.
- [x] 5.5 Update `conversation-service.removeConversation(id)`: keep the existing `skillTracker.clear(id)` call but route through registry: `conversationRegistry.dispose(id)` (which clears skills) AND keep `deleteConversationSkills(id)` for DB cleanup.
- [x] 5.6 Delete `electron/services/skill-tracker.ts`.

## 6. AgentLoop refactor — receive runtime via constructor

- [x] 6.1 Add `runtime: ConversationRuntime` field to `AgentLoop`.
- [x] 6.2 Update `AgentLoop` constructor: `new AgentLoop(options, runtime)`. The `runtime` is passed in by `chat-service` after lazy-getting it from the registry.
- [x] 6.3 Replace `convStatus.set(this.ctx.convId, snapshot)` in `emitStatus()` with `this.runtime.updateStatus(snapshot)`.
- [x] 6.4 Remove all imports of `agent-shared` Maps (`convTrustMode`, `convStatus`, `pendingConfirmations`) from `agent-loop.ts`.
- [x] 6.5 Update `chat-service.sendChatMessage` to lazy-get runtime, set controller, then construct `new AgentLoop(options, runtime).start()`.

## 7. Delete dead state from agent-shared

- [x] 7.1 Remove `convTrustMode` Map declaration from `agent-shared.ts`.
- [x] 7.2 Remove `pendingConfirmations` Map declaration from `agent-shared.ts`.
- [x] 7.3 Remove `convStatus` Map declaration from `agent-shared.ts`.
- [x] 7.4 `agent-shared.ts` should now contain only: `TOKEN_LIMIT`, `COMPRESSION_THRESHOLD`, `AgentRunOptions`, `AgentStatusSnapshot` type. If it's only types/constants, that's fine — keep the file.

## 8. Lifecycle integration

- [x] 8.1 In `conversation-service.removeConversation(id)`: ensure call order is `conversationRegistry.dispose(id)` (memory cleanup) → existing DB cleanup (`deleteConversation`, etc.). Disposing runtime before DB delete is correct (aborts in-flight loop before its rows go away).
- [x] 8.2 Verify `conversationRegistry.dispose(convId)` aborts the controller and rejects pending asks. Add console.warn if a runtime is disposed while it has an active controller (would indicate a race).

## 9. Verification

- [x] 9.1 Run `npx vue-tsc --noEmit`, fix all type errors.
- [x] 9.2 Manual test: send a message, complete a tool round, verify status updates flow through `runtime.status`. **PASS**
- [x] 9.3 Manual test: trigger a permission ask (`write_file` with permission=ask), confirm via UI, verify the resolution routes through `runtime.resolveAsk` (add temporary console.log to confirm). **PASS**
- [x] 9.4 Manual test: cancel a streaming conversation, verify `runtime.abortCurrent()` fires and the loop terminates. **PASS**
- [x] 9.5 Manual test: delete a conversation while another is active, verify only the target runtime is disposed. **PASS (runtime side); revealed UI bug — see 9.5a**
- [x] 9.5a UI fix: `ConversationList.vue handleDelete` unconditionally calls `chatStore.reset()`, clearing the current conversation's messages even when deleting a different one. Fix: only reset when deleting the active conversation, and reload messages for the new active conversation if the active one was deleted.
- [x] 9.6 Manual test: send a message in conversation A, while it's streaming a tool, switch to conversation B and send another message. Verify both runtimes coexist and emit independently. **PASS**
- [x] 9.7 Manual test: add a #skill reference, send message, verify the skill is loaded into the runtime and injected into the LLM messages. **PASS (within session); revealed regression on app restart — see 9.7a**
- [x] 9.7a Regression fix (introduced by this refactor): on app restart, `conversationRegistry.get(convId)` creates a fresh runtime with empty `skills`, so DB-persisted skill names are not injected. Old `skill-tracker.get()` had a DB lazy-load fallback that was lost in the migration. Fix: in `chat-service.sendChatMessage`, warm a new runtime once from DB (skill names + trustMode) before the agent loop reads from it. Add `warmed` flag on runtime to gate this.
- [x] 9.8 Manual test: quit app, verify `disposeAll()` runs cleanly (no unhandled rejections in console). **PASS** (`Autofill.enable`/`Autofill.setAddresses` are Chromium devtools noise unrelated to runtime; "找不到进程" is the dev script killing an already-exited child process)

## 10. Documentation finalization

- [x] 10.1 Update `design.md` with a "Retrospective" section noting any decisions that had to be revised during implementation.
- [x] 10.2 Mark all tasks in this file complete before archiving.
- [x] 10.3 Verify `specs/conversation-runtime/spec.md` requirements all have implementation evidence (file:line references).

---

## Phase 2+ (not in this change)

Stubs for awareness; do not implement here.

### Phase 2: TitleGenerator (separate change)
- Extract `generateTitle()` from `AgentLoop` to standalone `services/title-generator.ts`
- `chat-service` schedules it post-`agent.start()` if first turn
- Title generation uses runtime for cancellation if conversation is deleted mid-flight

### Phase 3: StreamRunner (separate change)
- Extract `doStreaming()` body (chatStream callbacks, accumulators) into `StreamRunner`
- `AgentLoop` calls `await streamRunner.run(messages, signal): StreamResult`

### Phase 4: ToolExecutor (separate change)
- Extract `doExecuteTools()`, `executeOneTool()`, `recordToolFailure()`, `parseToolArguments()` into `ToolExecutor`
- ToolExecutor receives runtime for ask routing

### Phase 5: StatusReporter + ContextCompressor (separate change)
- StatusReporter subscribes to runtime status changes, throttles, emits to renderer
- AgentLoop and other components stop calling `emitToRenderer` directly
- ContextCompressor extracted from `summarizeContext` + `compressContext`
