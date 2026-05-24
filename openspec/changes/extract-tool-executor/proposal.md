## Why

`AgentLoop` currently handles tool argument parsing, permission checking, tool execution, error recording, and persistence all inline in `doExecuteTools()`, `doWaitUser()`, `executeOneTool()`, and `recordToolFailure()` (~95 lines across 3 methods). These are a cohesive unit with a clear boundary: input is a single `ToolCall`, output is a message mutation + DB write + IPC emit. Extracting them into `ToolExecutor` is the highest-value split — it removes the largest block from the God class and makes the permission flow independently testable.

## What Changes

- Create `electron/services/tool-executor.ts` with `ToolExecutor` class accepting `(convId, config, runtime, undoService)`
- Methods: `execute(toolCall): Promise<void>` — handles parse → permission check → ask routing → execution → persistence → emit. Returns nothing (side-effects only: `this.ctx.messages.push`, `saveToolMessage`, IPC events)
- `recordToolFailure(toolName, tcId, error)` becomes a private method on ToolExecutor
- `parseToolArguments` moves from agent-loop.ts to tool-executor.ts
- `doWaitUser()` merges into ToolExecutor: the "wait" is a state machine concern, but the "what to do after approval/denial" is tool execution
- AgentLoop's `pendingTools` and `pendingAskId` still live in AgentContext — ToolExecutor reads/writes them via reference

## Capabilities

### New Capabilities

- `tool-executor`: Encapsulated tool execution pipeline. Handles argument parsing, permission resolution (deny/ask/always), prompt routing via runtime for ask, tool invocation via registry, result persistence to DB, and IPC event emission (TOOL_START/TOOL_END/TOOL_ERROR/ASK). Isolated from state machine for testability.

### Modified Capabilities

- `agent-state-machine`: `doExecuteTools()` and `doWaitUser()` streamlined to delegate to ToolExecutor. `executeOneTool()` and `recordToolFailure()` removed. State transitions remain in AgentLoop.
- `permission-system`: ToolExecutor becomes the single place where permission checks happen. Same rules (runtime.trustMode vs config.permissions), same ask routing (runtime.registerAsk).

## Impact

- `electron/services/tool-executor.ts` — **new** (~120 lines)
- `electron/services/agent-loop.ts` — `doExecuteTools` (~55→10 lines), `doWaitUser` (~35→5 lines), remove `executeOneTool`, `recordToolFailure`, `parseToolArguments` (~70 lines removed total)
- `electron/services/chat-service.ts` — inject `ToolExecutor` into `AgentLoop` constructor
