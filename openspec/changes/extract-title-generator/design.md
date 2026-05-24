## Context

`AgentLoop.generateTitle()` (line 389–418) is a 25-line private method that:
1. Constructs a separate LLM prompt with the last 4 messages
2. Calls `this.client.chat(...)` with an independent `new AbortController().signal`
3. Writes `renameConversation(convId, title)` to DB
4. Emits `EVENT_TITLE_GENERATED` IPC event
5. Silently catches all errors

It is business-logically independent of the agent loop — title generation only needs `convId`, the last few messages, and the LLM config. The agent loop's only connection is the trigger point (`doStreaming` when `toolCalls.length === 0` and first turn), and the shared `this.client` / `this.config` references.

Phase 1 already established the pattern: AgentLoop receives a `ConversationRuntime` via constructor injection. Phase 2 applies the same pattern: title generation is lifted out as an external collaborator, signaled via a callback rather than a hardcoded internal call.

## Goals / Non-Goals

**Goals:**
- Remove `generateTitle()` from `AgentLoop` — shrink the God class by one responsibility
- Create a standalone `generateTitle()` function in a new file with explicit dependencies (no `this.*`)
- Make the trigger point configurable: `AgentLoop` calls a callback instead of a hardcoded method
- Zero behavior change: same prompt, same LLM call, same DB write, same IPC emit, same error-silence policy

**Non-Goals:**
- Changing the title generation prompt or logic
- Changing when title generation triggers (still first turn with no tool calls)
- Making title generation cancellable (still uses independent AbortController)
- Retry or fallback logic for title generation failures
- Extracting any other AgentLoop responsibility (that's Phases 3–5)

## Decisions

### Decision 1: External callback (`onFirstTurnComplete`) vs injected service

**Alternatives:**
- **A. Inject `TitleGenerator` as a constructor dependency** — clean OO, but adds another constructor param to AgentLoop (already taking options + runtime). For a single method that fires once, overkill.
- **B. Emit an event from AgentLoop that chat-service listens for** — decouples completely but adds an event bus or RxJS dependency. Phase 5 (StatusReporter) might justify this; premature for Phase 2.
- **C. Callback on `AgentRunOptions` (chosen)** — lightweight, zero new concepts, type-safe. Fits the existing pattern: `AgentRunOptions` already carries `signal`, `trustMode`, `customPrompt`. Adding `onFirstTurnComplete` is natural.

**Rationale:** Callback is the minimum viable mechanism. Phase 5 may introduce an event bus that subsumes this; if so, the callback can be replaced without touching AgentLoop internals. The callback approach leaves the door open.

### Decision 2: `generateTitle()` as a standalone function vs a class

**Rationale:** The function has no state. It takes 4 inputs (convId, messages, config, client) and produces 2 side effects (DB write + IPC emit). A plain exported function with explicit parameters is simpler, more testable, and follows the same pattern as `resolveSkill()` in `skill-service.ts`.

### Decision 3: Where does `chat-service` wire the callback?

`sendChatMessage` already has the runtime, config, and convId in scope. When constructing the `AgentRunOptions`, it passes:

```ts
onFirstTurnComplete: () => {
  generateTitle(convId, runtime.status /* ... */, config, client);
}
```

The `messages` needed are the last few from the conversation context — but `generateTitle` can't access `this.ctx.messages` since it's no longer inside AgentLoop. Options:
- **A. Pass `messages` snapshot from agent-loop** — the loop must capture a snapshot of recent messages before/during `doStreaming` completion. This exposes internal state.
- **B. Re-read from DB** — `listMessages(convId).slice(-4)`. Adds a DB round-trip but is simple and correct (the messages were just saved by `saveAssistantMessage`).

**Chosen: B** — re-read from DB. Simpler contract, no need to expose agent-loop internals through the callback.

### Decision 4: File naming and location

`electron/services/title-generator.ts`. Follows the existing naming pattern (`undo-service.ts`, `conversation-service.ts`). Separated from `agent-service.ts` to reinforce the "this is not agent-loop internals" message.

## Risks / Trade-offs

- **[Risk] Race on first-turn detection.** `hasAssistantResponse(this.ctx.history)` is the gate. If Phase 3/4 changes how history is tracked, the gate may misfire. **Mitigation:** the logic stays in `doStreaming()`, unchanged — extraction only moves the "what happens after", not the "when to trigger".

- **[Risk] DB re-read in generateTitle costs one extra query.** `listMessages(convId)` for the last 4 messages is trivial (indexed by `conv_id, created_at`). **Mitigation:** negligible cost.

- **[Trade-off] `onFirstTurnComplete` callback name is vague.** It fires when the *first turn* completes with no tool calls — arguably should be `onFirstResponseComplete`. **Chosen name** because Phase 1 design.md already used this term consistently, and the semantics are documented here.

## Open Questions

- **Should `generateTitle` run on the same `OpenAIClient` instance as the conversation?** Currently AgentLoop holds `this.client`. The standalone function needs its own client or a passed-in client. **Decision deferred to implementation:** simplest approach is to construct a new `OpenAIClient()` inside `generateTitle` (it's stateless). If config changes between `start()` and title generation, the new client picks up the latest values — arguably a feature.
