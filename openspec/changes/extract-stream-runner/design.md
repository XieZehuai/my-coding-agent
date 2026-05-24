## Context

`AgentLoop.doStreaming()` currently:
1. Checks compression threshold → transitions if needed
2. Calls `this.client.chatStream(...)` with callbacks
3. Accumulates `content`, `reasoningContent`, `toolCalls` via callbacks
4. Emits `EVENT_TOKEN`, `EVENT_REASONING`, `EVENT_TOOL_CALLS` in real-time
5. On error: checks `isCancelledError`, transitions to cancelled/error
6. On success: `saveAssistantMessage`, pushes to `this.ctx.messages`
7. If no toolCalls: check `hasAssistantResponse`, call `generateTitle` (or callback), emit COMPLETE
8. If toolCalls: set `this.ctx.pendingTools`, transition to executing_tools

Steps 2–5 are purely about streaming mechanics. Steps 6–8 are about what happens *after* the stream — state transitions and persistence. The split is clear.

## Goals / Non-Goals

**Goals:**
- Extract LLM streaming call + delta accumulation + real-time emit into `StreamRunner`
- `AgentLoop.doStreaming()` becomes a thin coordinator (~15 lines)
- Same behavior: same callbacks, same emits, same error handling, same persistence

**Non-Goals:**
- Changing the streaming protocol (still uses `OpenAIClient.chatStream`)
- Changing how tool call accumulation works (still `Map<index, ToolCall>` inside StreamRunner)
- Extracting compression threshold check (stays in AgentLoop as state decision)
- Extracting "what happens after stream" logic (title generation / tool dispatch — those are Phase 2 and Phase 4)

## Decisions

### Decision 1: StreamRunner creates emit calls internally vs returns event objects

**Alternatives:**
- **A. StreamRunner emits IPC directly (chosen)** — matches current behavior exactly. StreamRunner depends on `ipc/handlers.emitToRenderer`. Simple migration.
- **B. StreamRunner returns events, AgentLoop emits them** — cleaner separation, but requires AgentLoop to buffer and re-emit stream events. Phase 5 (StatusReporter) may normalize this; premature for Phase 3.
- **C. StreamRunner receives an `onEvent` callback** — a middle ground, but over-abstracted for a single consumer.

**Rationale:** Keep it simple, match current behavior. When Phase 5 introduces StatusReporter, StreamRunner can emit through it instead. The IPC dependency is already present in AgentLoop; this doesn't add a new coupling.

### Decision 2: Constructor vs function

`StreamRunner` is instantiated once per AgentLoop. It holds `convId` and `config` (immutable for the loop duration). Constructor injection:

```ts
class StreamRunner {
  constructor(private convId: string, private config: ApiConfig, private client: OpenAIClient) {}
  async run(messages: ChatMessage[], signal: AbortSignal): Promise<StreamResult>
}
```

### Decision 3: Error handling boundary

StreamRunner's `run()` returns the accumulated result or throws. The caller (AgentLoop.doStreaming) catches and handles state transitions. This is already the pattern — `streamError` is a local variable checked after the `chatStream` call returns. `StreamRunner` can either:
- Return `{ error?: Error }` in the result (mirrors current `streamError` pattern)
- Throw

**Chosen: throw.** Caller wraps in try/catch. Cleaner than returning an error variant.

## Risks / Trade-offs

- **[Risk] StreamRunner IPC emits may reference a stale convId if runtime is disposed mid-stream.** Current behavior — not introduced by this change. Mitigated in Phase 1 (runtime.dispose aborts controller → stream terminates).

- **[Trade-off] StreamRunner depends on `emitToRenderer`.** Same coupling AgentLoop already has. Phase 5 decouples it.

## Open Questions

- **Should StreamRunner be responsible for `saveAssistantMessage` and `this.ctx.messages.push`?** Currently these happen in AgentLoop after `doStreaming` returns. StreamRunner could do them internally. **Defer to implementation:** leave them in AgentLoop for now (they're "post-stream" logic, orchestration concern). Phase 4 (ToolExecutor) may shift the boundary.
