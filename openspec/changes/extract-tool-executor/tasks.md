## 1. Create ToolExecutor class

- [ ] 1.1 Create `electron/services/tool-executor.ts` with `ToolExecutor` class. Constructor takes `(convId, config, runtime, undoService)`. Core method: `execute(toolCall: ToolCall): Promise<{ completed: boolean; awaitingAsk: boolean }>`. Internally handles parse → permission → deny/ask/execute paths. Uses `emitToRenderer` for IPC. Uses `saveToolMessage` for persistence. Pushes to `ctx.messages` via passed-in array reference.
- [ ] 1.2 Move `parseToolArguments()` from `agent-loop.ts` to `tool-executor.ts` (as a module-level helper).
- [ ] 1.3 Move `recordToolFailure()` from `agent-loop.ts` to `tool-executor.ts` (as a private method).
- [ ] 1.4 Move the tool execution + log entry code from `executeOneTool()` into `ToolExecutor` (the actual `executeTool` call + log entry + emit + persist).

## 2. Simplify AgentLoop doExecuteTools

- [ ] 2.1 Replace `doExecuteTools()` body: pop first tool from `pendingTools`, call `this.toolExecutor.execute(tool, this.ctx.messages, this.ctx.toolLogs)`. If result says `awaitingAsk`: set `this.ctx.pendingAskId` and transition to `waiting_user`. If `completed` and pendingTools empty: call `nextRound()`. If `completed` and pendingTools not empty: return (next step will pop next tool).
- [ ] 2.2 Remove `executeOneTool()` and `recordToolFailure()` private methods from `agent-loop.ts`.
- [ ] 2.3 Remove `parseToolArguments` function from `agent-loop.ts`.
- [ ] 2.4 Update `doWaitUser()` to use `this.toolExecutor.handleAskResolution(tool, approved, this.ctx.messages, this.ctx.toolLogs)` for both approval and denial paths.

## 3. Wire in chat-service

- [ ] 3.1 In `chat-service.sendChatMessage`, construct `new ToolExecutor(convId, config, runtime, undoService)` and pass to `new AgentLoop(options, runtime, streamRunner, toolExecutor)`.
- [ ] 3.2 Update `AgentLoop` constructor to accept `toolExecutor: ToolExecutor`.

## 4. Verification

- [ ] 4.1 Run `npx vue-tsc --noEmit`, fix all type errors.
- [ ] 4.2 Manual test: send a message that triggers a read tool, verify it executes and result is displayed.
- [ ] 4.3 Manual test: send a message that triggers a write with ask permission, verify permission modal appears and resolution works.
- [ ] 4.4 Manual test: change config to deny write, verify tool is denied with error displayed.
