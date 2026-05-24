## Context

The tool execution flow in AgentLoop has 4 phases:
1. **Parse** — `parseToolArguments(raw)` → `{ ok, args }` or `{ error }`
2. **Permission** — `getPermissionCategory` → `config.permissions[cat]` → deny / ask / execute
3. **Ask routing** — `emitToRenderer(EVENT_ASK)` → `runtime.registerAsk` → `transition(waiting_user)` → wait → `transition(executing_tools)`
4. **Execute + Persist** — `executeTool` → `saveToolMessage` → `ctx.messages.push`

All four are tool-level concerns, not state-machine concerns. The state machine only needs to know "tool execution done → what next?".

## Goals / Non-Goals

**Goals:**
- Extract phases 1–4 into `ToolExecutor` class
- ToolExecutor receives `ConvId`, `AppConfig`, `ConversationRuntime`, `UndoService` in constructor
- `execute(toolCall): Promise<ExecuteResult>` returns indication for AgentLoop to decide next state
- AgentLoop's `doExecuteTools()` becomes: `pop tool → executor.execute(tool) → transition`
- No behavior change

**Non-Goals:**
- Changing how tools are defined or registered
- Changing the permission model
- Making tools run in parallel (they're sequential by design)

## Decisions

### Decision 1: PendingTools ownership

`ctx.pendingTools` and `ctx.pendingAskId` stay in `AgentContext`. ToolExecutor receives `pendingTools: ToolCall[]` and `pendingAskId: string | null` as mutable references (or the entire ctx). Not ideal — in a future refactor `pendingTools` could move to ToolExecutor's internal queue. But for now, moving them would change the state machine's contract too much.

**Alternative considered:** let ToolExecutor own a `pendingQueue: ToolCall[]`. Requires AgentLoop to not manage `pendingTools` at all, and `doExecuteTools` → `nextRound` logic to query ToolExecutor. Cleaner but bigger change. Deferred.

### Decision 2: doWaitUser stays in AgentLoop, but "resolve" logic moves to ToolExecutor

The `waiting_user` state is a state machine concern (it pauses the loop). The "what happens when the user approves/denies" is a tool concern. Split:

- AgentLoop `doWaitUser()`: handles the `await this.waitForConfirmation(...)` call, transition back to `executing_tools`
- ToolExecutor: provides `handleAskResolution(toolCall, approved)` that does the actual approval/denial handling (emit, persist, push)

### Decision 3: ToolExecutor depends on emitToRenderer

Same as StreamRunner (Phase 3 Decision 1). IPC dependency is already present. Phase 5 will route through StatusReporter.

## Risks / Trade-offs

- **[Risk] ToolExecutor mutating ctx.messages and ctx.pendingTools via reference.** Two classes mutating shared state. Acceptable short-term (Phase 1 already has this: AgentLoop mutates runtime via reference). Future: ToolExecutor owns its own context slice.

- **[Risk] doWaitUser split may feel unnatural.** The `waitForConfirmation` call is the bridge between state machine and tool execution. Keep it in AgentLoop for now; if it feels wrong, revisit in Phase 5.
