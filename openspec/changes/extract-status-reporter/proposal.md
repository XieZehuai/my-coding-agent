## Why

IPC emission (`emitToRenderer`) is currently called directly from `AgentLoop`, `chat-service`, and the extracted `StreamRunner`/`ToolExecutor`. There is no single surface for event routing or throttling. Extracting a `StatusReporter` consolidates IPC emission and makes the soon-to-be-extracted `emitStatus` with throttling reusable.

## What Changes

- Create `electron/services/status-reporter.ts`: `reportEvent(convId, channel, data)` as typed passthrough for token/reasoning/tool events; `reportStatus(convId, snapshot)` with throttled EVT\\_STATUS emission
- `AgentLoop.emitStatus()` and `throttledEmitStatus()` moved to StatusReporter, AgentLoop calls `this.reporter.reportStatus(snapshot)`

## Capabilities

### New Capabilities
- `status-reporter`: Centralized IPC event emission with throttled status reporting. Future home for event bus routing when multi-conversation streaming requires per-conv event filtering.

## Impact
- `electron/services/status-reporter.ts` — **new** (~50 lines)
- `electron/services/agent-loop.ts` — `emitStatus`/`throttledEmitStatus` removed
- `electron/services/agent-loop.ts` — `generateTitle()` still emits directly (Phase 2 callback handles it)
