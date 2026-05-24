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

- [ ] 1.1 Create `electron/services/conversation-runtime.ts` with `ConversationRuntime` class skeleton: `convId`, `disposed`, `controller`, `status`, `pendingAsks`, `skills` fields. Add `dispose()`, `isDisposed()` methods.
- [ ] 1.2 In `conversation-runtime.ts`, add `abortCurrent()`, `registerAsk(askId, resolve)`, `resolveAsk(askId, approved)`, `rejectAllAsks()`, `updateStatus(snapshot)`, `setSkillsCache(skills)` methods.
- [ ] 1.3 Create `electron/services/conversation-registry.ts` with `ConversationRegistry` class: `runtimes: Map<convId, ConversationRuntime>`, `get(convId)`, `dispose(convId)`, `disposeAll()`. Export singleton `conversationRegistry`.
- [ ] 1.4 Update `electron/main.ts` `before-quit` handler: call `conversationRegistry.disposeAll()` before `closeDb()`.

## 2. Migrate `convStatus` and `convTrustMode` reads

- [ ] 2.1 In `agent-service.getAgentStatus(convId)`: change `convStatus.get(convId)` → `conversationRegistry.get(convId).status`.
- [ ] 2.2 Decide trust-mode policy: per design.md Decision 1, trust mode is consulted from `Conversation` row at agent-start time. Remove `convTrustMode` Map usage in `agent-loop.ts:223` — read trust from `Conversation` via `getConversationTrustMode(convId)` once per `start()` and store in `AgentContext.trustMode`.
- [ ] 2.3 In `agent-service.setTrustMode(convId, enabled)`: keep the DB write (`setConversationTrustMode`); remove the `convTrustMode.set(...)` line (the Map is now dead).
- [ ] 2.4 In `chat-service.sendChatMessage`: remove `convTrustMode.set(convId, trustMode)` (the value is now read from DB at agent-start time, not pushed in via the trustMode parameter; instead, `chat-service` writes via `setConversationTrustMode` if trustMode differs from DB, or accepts the existing DB value).

## 3. Migrate `pendingConfirmations` to runtime-local

- [ ] 3.1 Update `shared/types.ts`: no type change needed for `IPC.AGENT_CONFIRM` channel name, but document the new payload shape in a comment near `EVENT_ASK`.
- [ ] 3.2 Update `electron/preload.ts` `confirmAsk` signature: `(convId: string, askId: string, approved: boolean) => ipcRenderer.invoke(IPC.AGENT_CONFIRM, convId, askId, approved)`.
- [ ] 3.3 Update `electron/ipc/register.ts` `AGENT_CONFIRM` handler: accept `(convId, askId, approved)`; call `resolveConfirmation(convId, askId, approved)`.
- [ ] 3.4 Update `agent-service.resolveConfirmation(convId, askId, approved)`: route through `conversationRegistry.get(convId).resolveAsk(askId, approved)`. Remove the global `pendingConfirmations` Map usage.
- [ ] 3.5 Update `agent-loop.ts` `waitForConfirmation`: replace `pendingConfirmations.set(askId, ...)` with `this.runtime.registerAsk(askId, finish)`. Remove import of `pendingConfirmations` from `agent-shared`.
- [ ] 3.6 Update `src/composables/useAgent.confirmAsk` callsite: pass `convId` as first argument. Pull convId from the closure already established in `setupListeners(convId)`.
- [ ] 3.7 Update `src/components/chat/PermissionModal.vue` (or wherever `confirmAsk` is invoked from): ensure `convId` is available and passed.

## 4. Migrate `agentControllers` to runtime

- [ ] 4.1 In `chat-service.sendChatMessage`: replace `agentControllers.set(convId, ac)` with `conversationRegistry.get(convId).controller = ac`. The lazy-get also creates the runtime if absent.
- [ ] 4.2 In `chat-service.sendChatMessage` `.finally()`: replace `agentControllers.delete(convId)` with clearing `runtime.controller = null` (but do not dispose the runtime; runtime survives across multiple sends).
- [ ] 4.3 In `chat-service.cancelChat(convId)`: replace `agentControllers.get(convId)?.abort()` with `conversationRegistry.get(convId).abortCurrent()`.
- [ ] 4.4 Remove `const agentControllers` declaration at top of `chat-service.ts`.

## 5. Migrate `conversationSkills` (skill-tracker.ts → runtime)

- [ ] 5.1 In `conversation-runtime.ts`, add the `skills: TrackedSkill[]` field with default `[]`, and methods `addSkill(name)`, `getSkillsContent(projectPath, resolveSkillFn)`, `clearSkills()`.
- [ ] 5.2 Move the lazy-resolve logic from `skill-tracker.get(convId, projectPath)` into `runtime.getSkillsContent(projectPath, resolveSkill)`. The runtime depends on a callback (passed in by service layer) for `resolveSkill`, keeping runtime free of `skill-service.ts` import.
- [ ] 5.3 Update `chat-service.sendChatMessage`: replace `skillTracker.add(convId, name)` with two calls — `conversationRegistry.get(convId).addSkill(name)` AND `saveConversationSkill(convId, name)` (the existing DB call). Decision 1 double-write pattern.
- [ ] 5.4 Update `agent-loop.start()`: replace `skillTracker.get(convId, projectPath)` with `this.runtime.getSkillsContent(projectPath, resolveSkill)`.
- [ ] 5.5 Update `conversation-service.removeConversation(id)`: keep the existing `skillTracker.clear(id)` call but route through registry: `conversationRegistry.dispose(id)` (which clears skills) AND keep `deleteConversationSkills(id)` for DB cleanup.
- [ ] 5.6 Delete `electron/services/skill-tracker.ts`.

## 6. AgentLoop refactor — receive runtime via constructor

- [ ] 6.1 Add `runtime: ConversationRuntime` field to `AgentLoop`.
- [ ] 6.2 Update `AgentLoop` constructor: `new AgentLoop(options, runtime)`. The `runtime` is passed in by `chat-service` after lazy-getting it from the registry.
- [ ] 6.3 Replace `convStatus.set(this.ctx.convId, snapshot)` in `emitStatus()` with `this.runtime.updateStatus(snapshot)`.
- [ ] 6.4 Remove all imports of `agent-shared` Maps (`convTrustMode`, `convStatus`, `pendingConfirmations`) from `agent-loop.ts`.
- [ ] 6.5 Update `chat-service.sendChatMessage` to lazy-get runtime, set controller, then construct `new AgentLoop(options, runtime).start()`.

## 7. Delete dead state from agent-shared

- [ ] 7.1 Remove `convTrustMode` Map declaration from `agent-shared.ts`.
- [ ] 7.2 Remove `pendingConfirmations` Map declaration from `agent-shared.ts`.
- [ ] 7.3 Remove `convStatus` Map declaration from `agent-shared.ts`.
- [ ] 7.4 `agent-shared.ts` should now contain only: `TOKEN_LIMIT`, `COMPRESSION_THRESHOLD`, `AgentRunOptions`, `AgentStatusSnapshot` type. If it's only types/constants, that's fine — keep the file.

## 8. Lifecycle integration

- [ ] 8.1 In `conversation-service.removeConversation(id)`: ensure call order is `conversationRegistry.dispose(id)` (memory cleanup) → existing DB cleanup (`deleteConversation`, etc.). Disposing runtime before DB delete is correct (aborts in-flight loop before its rows go away).
- [ ] 8.2 Verify `conversationRegistry.dispose(convId)` aborts the controller and rejects pending asks. Add console.warn if a runtime is disposed while it has an active controller (would indicate a race).

## 9. Verification

- [ ] 9.1 Run `npx vue-tsc --noEmit`, fix all type errors.
- [ ] 9.2 Manual test: send a message, complete a tool round, verify status updates flow through `runtime.status`.
- [ ] 9.3 Manual test: trigger a permission ask (`write_file` with permission=ask), confirm via UI, verify the resolution routes through `runtime.resolveAsk` (add temporary console.log to confirm).
- [ ] 9.4 Manual test: cancel a streaming conversation, verify `runtime.abortCurrent()` fires and the loop terminates.
- [ ] 9.5 Manual test: delete a conversation while another is active, verify only the target runtime is disposed.
- [ ] 9.6 Manual test: send a message in conversation A, while it's streaming a tool, switch to conversation B and send another message. Verify both runtimes coexist and emit independently.
- [ ] 9.7 Manual test: add a #skill reference, send message, verify the skill is loaded into the runtime and injected into the LLM messages.
- [ ] 9.8 Manual test: quit app, verify `disposeAll()` runs cleanly (no unhandled rejections in console).

## 10. Documentation finalization

- [ ] 10.1 Update `design.md` with a "Retrospective" section noting any decisions that had to be revised during implementation.
- [ ] 10.2 Mark all tasks in this file complete before archiving.
- [ ] 10.3 Verify `specs/conversation-runtime/spec.md` requirements all have implementation evidence (file:line references).

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
