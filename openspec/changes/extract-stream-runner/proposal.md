## Why

`AgentLoop.doStreaming()` is a 75-line method that handles the LLM stream lifecycle — constructing the API call, accumulating deltas, emitting IPC events (token/reasoning/tool-calls), persisting the assistant message, and deciding the next state. This logic has clear boundaries: it takes `messages` + `config` + `signal` as input, and returns `{ content, reasoning, toolCalls, error }` as output. Extracting it as a standalone `StreamRunner` removes the second-largest chunk of the 489-line God class.

## What Changes

- Create `electron/services/stream-runner.ts` with `StreamRunner` class accepting `(config, client, convId)` in constructor
- `StreamRunner.run(messages, signal)` returns `StreamResult { content, reasoningContent, toolCalls }` — handles emit internally for real-time streaming, propagates errors
- `AgentLoop.doStreaming()` becomes a thin coordinator: instantiate runner, call `run()`, handle result
- All IPC emit calls (token, reasoning, tool-calls, tool-start/end/error during streaming) stay in StreamRunner
- `throttledEmitStatus` stays in AgentLoop (status emission is an orchestrator concern, not a stream concern)

## Capabilities

### New Capabilities

- `stream-runner`: Encapsulated LLM streaming handler. Manages `chatStream` call, delta accumulation, real-time IPC event emission for token/reasoning/tool-calls. Returns structured result. Separated from agent state machine so the orchestrator only cares about "stream completed → what next?"

### Modified Capabilities

- `agent-state-machine`: `doStreaming()` delegates streaming logic to injected `StreamRunner`. State transitions and the status emission remain in AgentLoop. Behavior unchanged.

## Impact

- `electron/services/stream-runner.ts` — **new** (~80 lines)
- `electron/services/agent-loop.ts` — `doStreaming()` simplified (~75→15 lines), `StreamRunner` injected via constructor
- `electron/services/chat-service.ts` — pass `StreamRunner` instance when constructing `AgentLoop` (or let AgentLoop create it internally — see design.md Decision 1)
