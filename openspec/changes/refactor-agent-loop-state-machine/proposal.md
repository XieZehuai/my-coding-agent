## Why

The agent loop in `agent-service.ts` is implemented as a single 170-line async function with ad-hoc control flow (`for` loop, scattered abort checks, inline state emissions). While functionally correct, the logic for streaming, compression, tool execution, and permission waiting is interwoven, making it hard to reason about state transitions, add new phases, or prepare for multi-agent scenarios. The `AgentState` union type exists in `shared/types.ts` but is unused by the runtime code — `AgentStatusSnapshot` uses a loose `string` instead. The frontend mirrors this fragmentation: three separate booleans (`isStreaming`, `isCancelled`, `error`) track what should be a single state field.

## What Changes

- **Backend**: Introduce `AgentLoop` class with explicit state machine (7 states: idle, streaming, compressing, executing_tools, waiting_user, completed, cancelled, error). Each state has a dedicated handler method. Transition logic is centralized.
- **Type system**: Replace `AgentStatusSnapshot.state: string` with `AgentState` union. Eliminate the local `DevStatus` interface in `DevPanel.vue` in favor of shared types.
- **Frontend**: Unify `isStreaming`, `isCancelled`, `error` into a single `state: AgentState` field in `chat.ts` store. Derive `isActive` and terminal type via computed properties. Update templates that reference these booleans.
- **IPC protocol**: `EVENT_STATUS` is now the authoritative source of agent state. Emitted on every transition. Individual events (`EVENT_TOKEN`, `EVENT_TOOL_START`, etc.) continue to carry data payloads.

## Capabilities

### New Capabilities

- `agent-state-machine`: Formal state machine pattern for the agent loop with typed states, dedicated handlers, and centralized transition logic. Prepared for future multi-agent coordination.

### Modified Capabilities

None. All existing requirements in `agent-chat`, `tool-system`, `permission-system`, and `dev-panel` remain unchanged — only the internal implementation and type correctness improve.

## Impact

- `electron/services/agent-service.ts` — rewritten as facade (exports `AgentLoop`, `getAgentStatus`, `setTrustMode`)
- `electron/services/agent-loop.ts` — **new** core state machine class (~250 lines)
- `electron/services/agent-context.ts` — **new** context type definition
- `electron/services/chat-service.ts` — 1-line change (`runAgentLoop()` → `new AgentLoop(...).start()`)
- `shared/types.ts` — `AgentStatusSnapshot` uses `AgentState` union
- `src/stores/chat.ts` — 3 booleans → 1 `state` field, new `isActive`/`terminalType` computed
- `src/composables/useAgent.ts` — minor update to listeners
- `src/components/chat/InputBox.vue` — template binding updates
- `src/components/dev/DevPanel.vue` — use shared `AgentStatus` type, remove local `DevStatus`
- Any template referencing `chatStore.isStreaming` or `chatStore.isCancelled`
