## 1. Shared Types

- [x] 1.1 Update `AgentStatusSnapshot` in `electron/services/agent-service.ts`: change `state: string` to `state: AgentState` (imported from `shared/types.ts`)
- [x] 1.2 Replace `isCancelled`, `error` usage in `agent-service.ts` with `state` field — emit proper `AgentState` values

## 2. Backend: AgentContext

- [x] 2.1 Create `electron/services/agent-context.ts` with `AgentContext` interface containing: `convId`, `projectPath`, `messages`, `history`, `round`, `maxTurns`, `signal`, `toolLogs`, `pendingTools`, `pendingAskId`, `undoService`
- [x] 2.2 Add `buildAgentContext()` factory function that constructs `AgentContext` from `AgentRunOptions`

## 3. Backend: AgentLoop State Machine

- [x] 3.1 Create `electron/services/agent-loop.ts` with `State` type and `AgentLoop` class skeleton (constructor, `start()`, `step()`, `transition()`, `isTerminal`, `emitStatus()`)
- [x] 3.2 Implement `doStreaming()`: emit status, check compression threshold, call LLM via `OpenAIClient.chatStream`, handle onToken/onReasoning/onToolCalls/onError callbacks, save assistant message. Transition to `compressing` (overflow), `completed` (no tools), `executing_tools` (has tools), or `error` (fail)
- [x] 3.3 Implement `doCompressing()`: call `summarizeContext()`, compress `ctx.messages`, transition back to `streaming`
- [x] 3.4 Implement `doExecuteTools()`: pop one tool from `ctx.pendingTools`, check permission, transition to `waiting_user` (ask) or execute immediately. When `pendingTools` empty, call `nextRound()`
- [x] 3.5 Implement `doWaitUser()`: use existing `waitForConfirmation()` mechanism, on resolve transition back to `executing_tools`
- [x] 3.6 Implement `nextRound()`: increment `ctx.round`, if `round > maxTurns` emit warning and transition to `completed`, else transition to `streaming`
- [x] 3.7 Implement `buildInitialMessages()`: inject tracked skills, custom prompt, build context — called in `start()` before entering state machine loop
- [x] 3.8 Implement centralized abort: check `ctx.signal.aborted` at top of `step()`, transition to `cancelled` if set

## 4. Backend: Refactor agent-service.ts

- [x] 4.1 Strip `runAgentLoop()` and helper functions from `agent-service.ts`
- [x] 4.2 Export `AgentLoop` class from `agent-loop.ts`
- [x] 4.3 Export `AgentContext` from `agent-context.ts`
- [x] 4.4 Keep `getAgentStatus()`, `setTrustMode()`, `resolveConfirmation()` — ensure they work with new state machine

## 5. Backend: Integration

- [x] 5.1 Update `chat-service.ts`: replace `runAgentLoop(options)` with `new AgentLoop(options).start()` (keep `.finally()` cleanup for `agentControllers`)
- [x] 5.2 Verify `PermissionModal.vue` and `confirmAsk` IPC flow still work (same `resolveConfirmation` mechanism used by `doWaitUser`)

## 6. Frontend: Chat Store

- [x] 6.1 Remove `isStreaming`, `isCancelled`, `error` refs from `chat.ts`
- [x] 6.2 Add `state: ref<AgentState>('idle')` and `lastError: ref<string | null>(null)` to `chat.ts`
- [x] 6.3 Add computed `isActive`: returns `true` for `streaming`, `compressing`, `executing_tools`, `waiting_user`
- [x] 6.4 Update `startStreaming()`: set `state` to `streaming`, keep segment/reset logic
- [x] 6.5 Update `finishStreaming()`: set `state` to `completed`
- [x] 6.6 Update `cancelStreaming()`: set `state` to `cancelled`
- [x] 6.7 Update `setError(err)`: set `state` to `error`, store message in `lastError`
- [x] 6.8 Update `reset()`: set `state` to `idle`, clear `lastError`
- [x] 6.9 Update return object: replace `isStreaming`/`isCancelled`/`error` with `state`/`isActive`/`lastError`

## 7. Frontend: useAgent Composable

- [x] 7.1 Update `onComplete` listener: call `chatStore.finishStreaming()` (no change needed if method updated)
- [x] 7.2 Update `onCancelled` listener: call `chatStore.cancelStreaming()` (no change needed if method updated)
- [x] 7.3 Update `onError` listener: call `chatStore.setError(data.error)` (no change needed if method updated)
- [x] 7.4 Verify `onAsk`, `onToken`, `onToolStart`, `onToolEnd`, `onToolError` listeners unchanged

## 8. Frontend: Templates

- [x] 8.1 Update `InputBox.vue`: replace `chatStore.isStreaming` with `chatStore.isActive` in `composer-shell` class, `disabled` attr, `v-if` on send button, and `placeholderText` computed
- [x] 8.2 Update `MessageList.vue`: replace `chatStore.isStreaming` with `chatStore.isActive` in welcome screen condition, streaming panel `v-if`, and watcher
- [x] 8.3 Update `MessageList.vue`: replace `chatStore.isCancelled` with `chatStore.state === 'cancelled'`
- [x] 8.4 Update `MessageList.vue`: replace `chatStore.error` with `chatStore.state === 'error'` and `chatStore.lastError`

## 9. Frontend: DevPanel

- [x] 9.1 Remove local `DevStatus` interface from `DevPanel.vue`
- [x] 9.2 Import `AgentStatus` from `shared/types.ts`, use as type for `status` ref
- [x] 9.3 Update template bindings that reference `state` (already typed as `AgentState` union)

## 10. Verification

- [x] 10.1 Run TypeScript typecheck: `npx tsc --noEmit` (or project equivalent), fix all type errors
- [x] 10.2 Run linter, fix all issues
- [ ] 10.3 Manual test: send a message, verify streaming → (tools) → completed flow
- [ ] 10.4 Manual test: cancel during streaming, verify state transitions to `cancelled`
- [ ] 10.5 Manual test: tool with `ask` permission, verify `waiting_user` state and flow
- [ ] 10.6 Manual test: verify dev panel shows proper state transitions
