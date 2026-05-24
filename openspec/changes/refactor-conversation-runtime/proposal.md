## Why

The Electron main process currently scatters per-conversation runtime state across 5 module-level `Map`s in 3 files:

| File | Map | Key | Purpose |
|---|---|---|---|
| `agent-shared.ts` | `convTrustMode` | convId | runtime mirror of DB trust flag |
| `agent-shared.ts` | `convStatus` | convId | latest status snapshot |
| `agent-shared.ts` | `pendingConfirmations` | **askId** | resolvers for permission asks |
| `chat-service.ts` | `agentControllers` | convId | AbortController for in-flight loop |
| `skill-tracker.ts` | `conversationSkills` | convId | tracked SKILL.md cache |

Consequences:

1. **Lifecycle leak** — `removeConversation()` only clears `skillTracker` and undo backups; the other 4 Maps grow unbounded for the lifetime of the app process. Aborting a deleted conversation, or sending a stale `confirmAsk`, has undefined behavior.
2. **Cross-cutting awareness** — `AgentLoop` directly imports and mutates module-level Maps from `agent-shared`, making it untestable in isolation and coupling the state machine to a specific storage strategy.
3. **Inconsistent indexing** — `pendingConfirmations` is keyed by `askId` (globally unique) while everything else is keyed by `convId`. Resolving a confirmation has no path back to the owning conversation, blocking per-conversation cleanup.
4. **God-class symptom** — `AgentLoop` (487 lines) has accreted 7 responsibilities (state machine, stream handling, tool dispatch, compression, status emission, title generation, config loading). Each new feature widens the class.

## What Changes

This is **internal refactoring**. No user-facing behavior changes, no IPC channel changes, no DB schema changes.

### Phase 1 — `ConversationRuntime` + `ConversationRegistry` (this proposal's primary deliverable)

- Introduce `ConversationRuntime` class: a per-conversation, **pure in-memory** container holding `controller`, `status`, `pendingAsks`, `skills`. Lifecycle is bounded by `dispose()`.
- Introduce `ConversationRegistry` singleton: `get(convId)` lazy-creates, `dispose(convId)` tears down, `disposeAll()` for app quit.
- `pendingAsks` becomes a runtime-local `Map<askId, resolver>`. Frontend `confirmAsk` IPC payload gains `convId` so the registry can route without a global reverse index.
- DB writes (`setConversationTrustMode`, `saveConversationSkill`) stay in their existing service modules. Runtime is **strictly memory**; service-layer functions own DB writes.
- Skills tracking moves from `skill-tracker.ts` (deleted) into `runtime.skills` + `services/skill-service.ts` for stateless lookup helpers.
- `AgentLoop` no longer imports `agent-shared`; it receives a `ConversationRuntime` reference and reads/writes through it.

### Subsequent phases (proposed, separate change docs)

- **Phase 2** — Extract `TitleGenerator` from `AgentLoop`. `chat-service` schedules it after first-turn completion.
- **Phase 3** — Extract `StreamRunner` (chat stream → callbacks → context.messages).
- **Phase 4** — Extract `ToolExecutor` (parse args + permission + execute + persist + emit).
- **Phase 5** — Extract `StatusReporter` (throttled emit + ToolLog accumulation) and `ContextCompressor`.

Each phase ships independently. This proposal covers only Phase 1; subsequent phases reference this proposal as prerequisite.

## Capabilities

### New Capabilities

- `conversation-runtime` — Per-conversation in-memory runtime container. Owns AbortController, status snapshot, pending permission asks, and tracked skills for one conversation. Has well-defined lifecycle: `Registry.get()` lazy-creates, `Registry.dispose(convId)` tears down (aborts in-flight work, rejects pending asks, frees memory).

### Modified Capabilities

- `agent-state-machine` — `AgentLoop` no longer imports module-level state from `agent-shared`. It receives a `ConversationRuntime` and routes all per-conversation state access through it. Behavior unchanged; coupling reduced.
- `permission-system` — `EVENT_ASK` payload still carries `askId`. The matching `IPC.AGENT_CONFIRM` invocation gains a `convId` parameter so the registry can route the resolution without a global ask→conv index. Frontend sends `convId` (which it already has in `useAgent` listener context).

## Impact

**Code:**
- `electron/services/conversation-runtime.ts` — **new** (~120 lines)
- `electron/services/conversation-registry.ts` — **new** (~50 lines)
- `electron/services/agent-shared.ts` — module-level Maps removed; file becomes type-only or deleted
- `electron/services/agent-loop.ts` — replace `agent-shared` imports with constructor-injected `ConversationRuntime`
- `electron/services/agent-service.ts` — `getAgentStatus`/`setTrustMode`/`resolveConfirmation` route through registry
- `electron/services/chat-service.ts` — `agentControllers` Map removed; controller stored on runtime
- `electron/services/skill-tracker.ts` — **deleted**; logic absorbed by `runtime.skills` + `skill-service.ts` helpers
- `electron/services/conversation-service.ts` — `removeConversation()` calls `registry.dispose(convId)`
- `electron/preload.ts` — `confirmAsk(askId, approved)` → `confirmAsk(convId, askId, approved)`
- `electron/ipc/register.ts` — `AGENT_CONFIRM` handler signature update
- `shared/types.ts` — no type changes needed (registry/runtime types are main-process internal)
- `src/composables/useAgent.ts` — `confirmAsk` call passes `convId`

**Docs (the user explicitly requested progress tracking discipline):**
- `tasks.md` — phased checklist; Phase 1 fully decomposed, Phases 2–5 listed as headings with "(separate change)" markers
- `design.md` — captures the 5 decisions made in exploration + rejected alternatives
- `specs/conversation-runtime/spec.md` — formal requirements + scenarios

**Tests:**
- Manual verification per scenario in tasks.md §Verification
- Future: ConversationRuntime is now unit-testable (no IPC/DB dependencies), but adding a test runner is out of scope for this change

**Compatibility:**
- DB schema unchanged
- IPC channel names unchanged (one payload shape change for `AGENT_CONFIRM`)
- No migration needed
