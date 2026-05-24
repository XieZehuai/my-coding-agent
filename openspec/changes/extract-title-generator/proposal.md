## Why

`AgentLoop.generateTitle()` is currently a private method on a 489-line God class, yet it has zero business coupling to the agent state machine. It uses an independent `AbortController`, calls the LLM outside the main conversation loop, and only persists a side effect (DB write + IPC emit). This is Phase 2 of the ConversationRuntime refactor — the simplest extraction that validates the "inject runtime, split collaborators" pattern.

## What Changes

- Create `electron/services/title-generator.ts` with `generateTitle(convId, messages, config, client)` — a pure function that takes explicit dependencies, calls the LLM, writes DB, and emits the event
- Remove the `generateTitle()` method from `AgentLoop`
- `AgentLoop.doStreaming()` after completing with no tool calls, calls `this.options.onFirstTurnComplete?.()` instead of `this.generateTitle()`
- `chat-service.sendChatMessage` passes an `onFirstTurnComplete` callback that invokes `generateTitle(...)` with the runtime-scoped convId/messages/config
- `AgentRunOptions` gains an optional `onFirstTurnComplete?: () => void` callback

## Capabilities

### New Capabilities

- `title-generator`: Standalone title generation service. Takes conversation context (convId, last few messages, LLM config), generates a Chinese title ≤15 chars via LLM, persists to DB, and emits `EVENT_TITLE_GENERATED`. Runs independently of the agent loop lifecycle.

### Modified Capabilities

- `agent-state-machine`: `AgentLoop` no longer owns title generation logic. The `doStreaming()` handler delegates first-turn title generation to an externally-provided callback. State machine behavior unchanged.

## Impact

- `electron/services/title-generator.ts` — **new** (~40 lines, standalone function)
- `electron/services/agent-loop.ts` — remove `generateTitle()` method (~25 lines removed), call callback instead
- `electron/services/agent-shared.ts` — `AgentRunOptions` gains optional `onFirstTurnComplete` callback
- `electron/services/chat-service.ts` — pass callback when constructing `new AgentLoop(...)`
- `electron/db/conversations.ts` — already has `renameConversation`, no change
- `openspec/specs/conversation-runtime/spec.md` — indirectly validated (Phase 1 injection pattern works for new collaborators)
