## Context

The main process holds five module-level `Map`s of per-conversation state plus a 487-line `AgentLoop` class. The current layout couples the state machine to a specific storage strategy (module globals), produces inconsistent keying (`askId` vs `convId`), and offers no lifecycle hook when a conversation is deleted. We explored the problem and converged on extracting a `ConversationRuntime` abstraction as the foundational refactor, before tackling the God-class problem.

This document captures the **five decisions** made during exploration and the rationale, plus the phased rollout strategy.

## Goals / Non-Goals

**Goals:**
- One object per conversation owns all conversation-scoped runtime state
- Lifecycle is explicit: lazy create on first access, deterministic dispose on conversation removal or app quit
- `AgentLoop` is decoupled from module globals — it receives a runtime reference and is testable in isolation
- DB writes stay in service layer; runtime is pure memory
- Set the foundation for phases 2–5 (`TitleGenerator`, `StreamRunner`, `ToolExecutor`, `StatusReporter`, `ContextCompressor`) without committing to them in this change

**Non-Goals:**
- Multi-window / multi-agent coordination
- Persisting runtime state across app restarts (runtime is ephemeral by design)
- Refactoring `AgentLoop` internals (phases 2–5)
- Changing IPC event protocol semantics
- Introducing a DI framework

## Decisions

### Decision 1: Runtime is pure in-memory; service layer owns DB writes

**Question:** Should `runtime.setTrustMode(b)` write to DB internally, or only update memory?

**Alternatives considered:**
- **A. Runtime writes DB internally** — single call updates both; impossible to forget the DB write. But couples runtime to DB layer and conflates concerns.
- **B. Runtime memory-only; service layer double-writes (chosen)** — `agent-service.setTrustMode(convId, b)` calls `runtime.setTrustMode(b)` AND `setConversationTrustMode(convId, b)`. Two writes at one call-site.

**Rationale:** The user explicitly chose B with the requirement "按领域做好设计" (design properly along domain boundaries). DB writes are infrastructure concerns; the runtime is a domain object. Mixing them violates the layering already established in the codebase (`db/` vs `services/`). The risk of "forgetting a write" is mitigated by keeping both writes in a single service function (e.g., `agent-service.setTrustMode`).

**Domain boundaries (resulting):**

```
┌─ Domain: Conversation Runtime (in-memory) ──────────────────┐
│   ConversationRuntime, ConversationRegistry                  │
│   Owns: AbortController, status snapshot, pendingAsks,       │
│         tracked skills (in-memory cache only)                │
│   Knows: nothing about SQL                                   │
└──────────────────────────────────────────────────────────────┘
                        ▲
                        │ called by
                        │
┌─ Domain: Service Layer (orchestration) ──────────────────────┐
│   agent-service, chat-service, conversation-service          │
│   Coordinates: runtime ↔ DB writes ↔ IPC                    │
│   Single call-site holds both reads and writes               │
└──────────────────────────────────────────────────────────────┘
                        ▲
                        │
┌─ Domain: Persistence ────────────────────────────────────────┐
│   db/conversations, db/messages, db/skills, db/undo          │
│   Pure SQL CRUD                                              │
└──────────────────────────────────────────────────────────────┘
```

### Decision 2: `pendingAsks` is runtime-local; frontend sends `convId`

**Question:** Where does `pendingAsks` live, and how does `resolveConfirmation(askId)` find it?

**Alternatives considered:**
- **A. Keep global `pendingConfirmations: Map<askId, ...>`** — current design, but contradicts the runtime-as-owner principle.
- **B. Local Map + global `askId → convId` reverse index** — runtime-owned, but adds a second Map that must be kept in sync. The user explicitly rejected this: "不要加大量索引，不然后续维护很麻烦".
- **C. Local Map + carry `convId` on the frontend round-trip (chosen)** — the `EVENT_ASK` payload already carries `convId`; the matching `IPC.AGENT_CONFIRM` invocation gains a `convId` parameter. `resolveConfirmation(convId, askId, approved)` routes through `registry.get(convId).resolveAsk(askId, approved)`.

**Rationale:** The data is naturally per-conversation. The reverse-index approach (B) adds a Map that has the same problem we're solving (global state with manual lifecycle). C is correct in principle: the frontend already knows which conversation issued the ask (it's the same convId it just received in `EVENT_ASK`), so it should pass it back.

**IPC shape change:**

```
Before:  ipcRenderer.invoke('agent:confirm', askId, approved)
After:   ipcRenderer.invoke('agent:confirm', convId, askId, approved)
```

This is the **only** wire-protocol change in this proposal. Frontend `useAgent.confirmAsk` already has `convId` in closure scope. Backward compatibility with old `confirmAsk(askId, approved)` is unnecessary since renderer and main ship together.

### Decision 3: SkillTracker absorbed into runtime

**Question:** Does `skill-tracker.ts` survive, or does its state move into runtime?

**Resolution:** Delete `skill-tracker.ts`. Move the `Map<convId, TrackedSkill[]>` into `runtime.skills`. Keep `skill-service.ts` (it's stateless: parse frontmatter, resolve SKILL.md content, search by query) — runtime calls into it for lookups.

DB CRUD (`saveConversationSkill`, `getConversationSkillNames`, `deleteConversationSkills`) stays in `db/skills.ts`. The double-write pattern from Decision 1 applies: `agent-service.addSkill(convId, name)` calls `runtime.addSkill(name)` AND `saveConversationSkill(convId, name)`.

**Rationale:** `skill-tracker.ts`'s only state is exactly the per-conversation cache the runtime is designed to own. No reason to keep it as a separate module.

### Decision 4: Emit goes through `StatusReporter` (Phase 5); for now, runtime exposes events via callbacks

**Question:** How do downstream components (`AgentLoop`, future `StreamRunner`/`ToolExecutor`) emit events without depending on `ipc/handlers`?

**Resolution (long-term):** Decision-deferred to Phase 5, but the runtime is designed to support it. In **this** change (Phase 1), `AgentLoop` continues to call `emitToRenderer(...)` directly. The refactor is non-disruptive: we change *where state lives*, not *who emits*. Decoupling emit happens later via `StatusReporter`.

**Rationale:** Decision 4 (option B: Reporter as middleware) was made for the future state. Implementing it now would balloon this PR. The runtime's interface is designed to be compatible with future `StatusReporter` injection: `runtime.status` is the single source, and a future reporter subscribes to its changes.

### Decision 5: Phased rollout with explicit progress documents

**Question:** How do we manage a multi-phase refactor without losing track?

**Resolution:** Each phase ships as its own OpenSpec change. This change covers **Phase 1 only**. Phases 2–5 are referenced in `proposal.md §What Changes` as planned successors and will get their own proposals when scheduled.

The user requested progress tracking discipline. Concretely:

1. **`tasks.md` is the single source of truth for in-progress status.** Every task has a checkbox. After each work session, tasks are marked done.
2. **`design.md` records every decision and rejected alternative.** When implementation reveals a wrong assumption, the assumption is invalidated in design.md (not silently corrected in code).
3. **Phase boundaries are enforced.** Phase 1 does not touch `AgentLoop` internals beyond removing the `agent-shared` imports. Any temptation to "fix this small thing while we're here" gets logged as a Phase 2+ task.
4. **At archive time**, a brief retrospective is added to design.md noting which decisions held up and which had to be revised.

## Component Shapes

### `ConversationRuntime`

```
class ConversationRuntime {
  readonly convId: string

  // Lifecycle
  private disposed: boolean

  // Run control
  controller: AbortController | null

  // Status
  status: AgentStatusSnapshot

  // Permission asks
  private pendingAsks: Map<askId, (approved: boolean) => void>

  // Skills (in-memory cache; DB is source of truth)
  skills: TrackedSkill[]

  // Behavior
  abortCurrent(): void
  registerAsk(askId, resolve): void
  resolveAsk(askId, approved): void
  rejectAllAsks(): void
  updateStatus(snapshot): void
  setSkillsCache(skills): void

  isDisposed(): boolean
  dispose(): void
    // - controller?.abort()
    // - rejectAllAsks()
    // - skills.length = 0
    // - disposed = true
}
```

Note: no `setTrustMode` method. Trust mode is consulted at config-read time per request (in `AgentLoop.doExecuteTools`); it's a property of `Conversation` (DB-backed), not a runtime cache. We were tempted to add a `trustMode` field but decided trust is a DB property already and adding a memory mirror creates a sync problem with no benefit. (This is a deviation from the initial sketch; recorded here for traceability.)

### `ConversationRegistry`

```
class ConversationRegistry {
  private runtimes: Map<convId, ConversationRuntime>

  get(convId): ConversationRuntime           // lazy create
  dispose(convId): void                       // teardown + remove
  disposeAll(): void                          // app quit
}

// Singleton exported as `conversationRegistry`
```

### Frontend `confirmAsk` shape change

```diff
- confirmAsk(askId: string, approved: boolean)
+ confirmAsk(convId: string, askId: string, approved: boolean)
```

Renderer-side change in `useAgent.confirmAsk`: already has access to current `convId` in closure; just pass it through. The `chatStore.pendingAsk` already stores the conversation context indirectly through `setupListeners(convId)` closure.

## Risks / Trade-offs

- **[Risk] Forgotten DB write at service layer.** With Decision 1, every `runtime.X()` mutation must be paired with a DB call at the service layer. Mitigation: define service functions (`agent-service.setTrustMode`, `agent-service.addSkill`) that own the pair; never call `runtime.X()` directly from IPC handlers.

- **[Risk] Disposed runtime still receiving emits.** An aborted `AgentLoop` may continue executing for a microtask before the abort throws; if `dispose()` fired during that window, emit would target a dead runtime. Mitigation: `runtime.isDisposed()` check before emit (added once `StatusReporter` is extracted in Phase 5); for now, the worst case is an event referencing a deleted conv, which the renderer's `if (data.convId === convId)` filter already drops.

- **[Risk] IPC payload change breaks live dev session.** `AGENT_CONFIRM` gains a parameter. Mitigation: this is desktop app; renderer and main ship as one binary; users do a full restart on update. Document in tasks.md as a coordinated change.

- **[Risk] Phase boundaries blurred.** Tempting to also fix the 4 unrelated issues raised in exploration (`emitToRenderer` broadcasting, `touchConversation` missing in `saveToolMessage`, etc.). Mitigation: `tasks.md` Phase 1 explicitly excludes them; create separate small proposals.

- **[Trade-off] Two write sites for trust/skills.** Decision 1's cost is that "set trust mode" lives in service layer as a function that writes both memory and DB. Test isolation gain (runtime is pure memory) is judged worth this small redundancy.

- **[Trade-off] Lazy-create in `Registry.get()`.** A new runtime is created the first time anyone asks for it, even if the conversation no longer exists in DB. Mitigation: `Registry.get(convId)` does not validate existence (service layer should have validated upstream). Callers in IPC handlers always validate via `getConversation(convId)` before reaching the runtime.

## Open Questions

- **`StatusReporter` injection mechanism for Phase 5.** Should the runtime hold a reporter reference, or should the registry inject one when constructing? Defer to Phase 5 proposal.

- **Test runner.** This change makes `ConversationRuntime` unit-testable but adds no tests because the project has no test runner yet. Phase 2+ may justify adding `vitest`. Tracked as future scope.
