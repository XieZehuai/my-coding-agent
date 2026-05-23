## Context

The agent loop is currently a single async function `runAgentLoop()` (~170 lines) with a `for` loop that mixes streaming, compression, tool execution, and permission waiting in ad-hoc control flow. The `AgentState` union type already exists in `shared/types.ts` but is unused by `AgentStatusSnapshot` (which uses `string`). The frontend tracks agent status with three separate booleans rather than a single state field. This fragmentation adds friction to adding new phases and preparing for multi-agent coordination.

## Goals / Non-Goals

**Goals:**
- Replace the procedural `for` loop in `agent-service.ts` with a typed `AgentLoop` class using explicit states and transitions
- Each state has a dedicated handler method, making control flow explicit and readable
- Abort/cancel handling centralized in one place
- `EVENT_STATUS` emitted on every transition, using the `AgentState` union
- Frontend unifies `isStreaming`, `isCancelled`, `error` into a single `state: AgentState`
- Shared types used end-to-end (no local type redefinitions)
- Design supports future multi-agent: each `AgentLoop` instance is isolated with its own state and context

**Non-Goals:**
- State machine library dependency (XState, robot3, etc.) — manual implementation is sufficient
- State persistence across application restarts — agent loop is ephemeral per conversation
- Pause/resume of in-flight agent loops
- Changing existing IPC event protocol (`EVENT_TOKEN`, `EVENT_TOOL_START`, etc. remain unchanged)
- Changing the behavior of built-in commands in `chat-service.ts`

## Decisions

### Decision 1: Manual class-based state machine (not XState or other library)

**Alternatives considered:**
- **XState**: Full statechart library with actors, guards, serializable state. Overkill for a linear, sequential loop. Adds ~14KB gzipped dependency with learning curve. No need for deep nesting or parallel states.
- **Lightweight transition table**: A `Record<State, Record<EventType, State>>` map. Clean for simple transitions but awkward for side-effectful state handlers (LLM calls, tool execution).
- **Manual class** (chosen): Each state is a method on the class. State stored as a private field. Central `transition()` method handles exit/enter and emits status. Natural for async handlers. No new dependencies.

**Rationale**: The agent loop is inherently sequential (stream → compress → tools → repeat). A class with method-per-state is the most readable approach. It keeps the code self-contained and avoids abstraction leakage.

### Decision 2: State design — 7 states, no nesting

```
idle → streaming → (compressing → streaming)* → (executing_tools → streaming)* → completed
                    ↘ cancelled / error (from any active state)
```

`executing_tools` handles permissions internally: when a tool needs user confirmation, transitions to `waiting_user`, then back to `executing_tools` (regardless of approve/deny). This avoids nesting `waiting_user` inside `executing_tools` while keeping the permission flow explicit as a top-level state.

`building_context` in the original `AgentState` type is not a separate state — context building is synchronous setup that happens before the state machine starts in `start()`.

### Decision 3: Round counter lives in AgentContext, not state machine

The `round` increment happens when transitioning from `executing_tools` back to `streaming`. The `maxTurns` check determines whether to go to `streaming` (continue) or `completed` (with warning). This mirrors the current `for` loop semantics: round starts at 1, increments after each tool-execution round, and the loop exits when `round > maxTurns`.

### Decision 4: Frontend — derive isActive, not separate booleans

**Alternatives considered:**
- **Keep three booleans**: Simplest migration but defeats the purpose of having a unified state.
- **Listen only to EVENT_STATUS**: The single source of truth for state. Individual events carry payload data within the current state context.

**Chosen**: Add `state: AgentState` to chat store. `isActive` computed from state. Templates change from `v-if="chatStore.isStreaming"` to `v-if="chatStore.isActive"`. `isCancelled` and `error` become `chatStore.state === 'cancelled'` and `chatStore.state === 'error'`.

The `EVENT_STATUS` event is now the authoritative driver of state — emitted on every transition, including those previously missed (`executing_tools`, `waiting_user`).

### Decision 5: File structure

```
electron/services/
├── agent-service.ts           → facade: exports AgentLoop, getAgentStatus, setTrustMode
├── agent-loop.ts              → NEW: AgentLoop class (~250 lines)
└── agent-context.ts           → NEW: AgentContext type + builder
```

Separating `agent-loop.ts` from `agent-service.ts` keeps the facade thin (imports + exports) and the state machine self-contained. `agent-context.ts` provides the context type so tests and other consumers can reference it.

### Decision 6: Keep current IPC event protocol

`EVENT_TOKEN`, `EVENT_TOOL_START`, `EVENT_TOOL_END`, `EVENT_TOOL_ERROR`, `EVENT_ASK`, `EVENT_COMPLETE`, `EVENT_CANCELLED`, `EVENT_ERROR` all remain. The only change is that `EVENT_STATUS` now fires on every transition (not just streaming/compressing) and its payload uses the `AgentState` union.

## Risks / Trade-offs

- **[Risk] Regression in agent behavior**: The refactor rewrites the core loop. Tool execution ordering, permission flow, or round counting could differ subtly. **Mitigation**: Use the existing spec scenarios as test cases. Compare round count, tool execution order, and abort behavior before/after.

- **[Risk] Frontend template breakage**: Any template using `chatStore.isStreaming`, `chatStore.isCancelled`, or `chatStore.error` directly must be updated. **Mitigation**: grep the entire `src/` for these fields before making changes. Use computed `isActive` and `terminalType` to minimize inline condition complexity.

- **[Risk] EVENT_STATUS event storms**: Status is now emitted on every transition (potentially many per round: streaming → compressing → streaming → executing_tools → waiting_user → executing_tools → streaming). **Mitigation**: The renderer already receives these events at these rates (streaming tokens arrive much more frequently). No performance concern.

- **[Risk] State and real status diverge**: If a handler throws but the state isn't properly set to `error`, the state machine and reality get out of sync. **Mitigation**: Wrap each handler in try/catch in the `step()` dispatch. Any unhandled error transitions to `error`.
