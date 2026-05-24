## ADDED Requirements

### Requirement: Per-conversation runtime container

The system SHALL provide a `ConversationRuntime` object that owns all in-memory, per-conversation state for the duration of a conversation's lifetime. The runtime SHALL hold the active `AbortController`, the latest `AgentStatusSnapshot`, pending permission ask resolvers, and the tracked skills cache. The runtime SHALL NOT perform database writes.

#### Scenario: Runtime created on first access

- **WHEN** code requests a runtime for a `convId` that has no runtime instance yet
- **THEN** the registry SHALL lazily create a fresh `ConversationRuntime` with empty state (no controller, idle status, no pending asks, empty skills)

#### Scenario: Runtime persists across multiple agent runs

- **WHEN** an agent loop completes and a new chat message is sent in the same conversation
- **THEN** the same `ConversationRuntime` instance SHALL be reused, retaining tracked skills and any cached status

#### Scenario: Runtime is memory-only

- **WHEN** trust mode or skills are modified through the runtime
- **THEN** the runtime SHALL only update its in-memory fields; the service layer caller SHALL be responsible for the corresponding database write

### Requirement: Deterministic runtime disposal

When a conversation is removed or the application quits, the system SHALL dispose the conversation's runtime. Disposal SHALL abort any active `AbortController`, reject all pending permission asks, clear the skills cache, and mark the runtime as disposed so further operations are no-ops or warnings.

#### Scenario: Conversation deletion disposes runtime

- **WHEN** `conversation-service.removeConversation(convId)` is invoked
- **THEN** `conversationRegistry.dispose(convId)` SHALL be called before the conversation row is deleted from the database, aborting any in-flight agent loop and rejecting pending asks

#### Scenario: App quit disposes all runtimes

- **WHEN** the Electron `before-quit` event fires
- **THEN** `conversationRegistry.disposeAll()` SHALL iterate every runtime and call `dispose()` on each before the database connection is closed

#### Scenario: Disposed runtime rejects pending asks

- **WHEN** a runtime with pending permission asks is disposed
- **THEN** every pending ask resolver SHALL be invoked with `approved = false`, allowing the agent loop's waiter to settle and the loop to exit cleanly

#### Scenario: Disposed runtime aborts active controller

- **WHEN** a runtime with an active `AbortController` is disposed
- **THEN** `controller.abort()` SHALL be called, causing in-flight fetch and tool execution to terminate

### Requirement: Runtime-local permission ask routing

Permission ask resolvers SHALL be stored on the owning conversation's runtime. The `IPC.AGENT_CONFIRM` channel SHALL carry the `convId` in its payload so the main process can route the resolution to the correct runtime without a global reverse index.

#### Scenario: Frontend confirm passes convId

- **WHEN** a user approves or denies a permission ask in the UI
- **THEN** the renderer SHALL invoke `confirmAsk(convId, askId, approved)` with the conversation identifier obtained from the agent listener closure

#### Scenario: Main process routes confirmation through runtime

- **WHEN** the `AGENT_CONFIRM` IPC handler receives `(convId, askId, approved)`
- **THEN** the handler SHALL call `conversationRegistry.get(convId).resolveAsk(askId, approved)`, which invokes the registered resolver and removes the entry from `pendingAsks`

#### Scenario: Unknown ask is silently ignored

- **WHEN** an `askId` arrives that has no registered resolver (e.g., the agent loop already cancelled)
- **THEN** the runtime SHALL ignore the resolution without throwing; no exception SHALL propagate to the IPC layer

### Requirement: Skills tracked per-runtime

The system SHALL store the tracked skills for each conversation on its runtime. The runtime SHALL provide methods to add a skill name, retrieve resolved skill content (with lazy loading via a caller-provided resolver), and clear the cache. Database persistence remains the responsibility of the service layer.

#### Scenario: Skill added to runtime

- **WHEN** `chat-service` detects a `#skill_name` reference in user input
- **THEN** the service SHALL call `runtime.addSkill(name)` to update the in-memory cache AND call `saveConversationSkill(convId, name)` to persist; both calls SHALL be at the same call-site

#### Scenario: Skill content lazily resolved

- **WHEN** `agent-loop.start()` requests skill content via `runtime.getSkillsContent(projectPath, resolveSkill)`
- **THEN** the runtime SHALL invoke the provided `resolveSkill` callback for any skill whose content is not yet cached, store the result, and return all resolved skills

#### Scenario: Skills cleared on disposal

- **WHEN** a runtime is disposed
- **THEN** the in-memory skills array SHALL be emptied; database rows in `conversation_skills` are deleted separately by `conversation-service.removeConversation` via `deleteConversationSkills`

### Requirement: AgentLoop decoupled from module globals

The `AgentLoop` class SHALL NOT import or mutate module-level state from `agent-shared.ts`. All per-conversation state access SHALL flow through a `ConversationRuntime` reference provided to the constructor. After this change, `agent-shared.ts` SHALL contain only stateless types and constants (`AgentRunOptions`, `AgentStatusSnapshot`, `TOKEN_LIMIT`, `COMPRESSION_THRESHOLD`).

#### Scenario: AgentLoop constructed with runtime

- **WHEN** `chat-service.sendChatMessage` starts an agent loop
- **THEN** the service SHALL acquire the runtime via `conversationRegistry.get(convId)`, attach the new `AbortController` to `runtime.controller`, and construct `new AgentLoop(options, runtime)`

#### Scenario: AgentLoop status writes go through runtime

- **WHEN** the agent loop transitions to a new state and calls `emitStatus()`
- **THEN** the snapshot SHALL be written via `this.runtime.updateStatus(snapshot)` and read by `getAgentStatus(convId)` via `conversationRegistry.get(convId).status`

#### Scenario: AgentLoop registers asks through runtime

- **WHEN** the agent loop enters `waiting_user` state and needs a permission decision
- **THEN** the `waitForConfirmation` helper SHALL register the resolver via `this.runtime.registerAsk(askId, finish)` and clean it up by relying on `runtime.resolveAsk` or `runtime.rejectAllAsks` during abort/dispose

## Implementation Evidence

| Requirement | Primary file:line(s) |
|---|---|
| Per-conversation runtime container | `electron/services/conversation-runtime.ts:50` (class), `electron/services/conversation-registry.ts:15` (lazy create) |
| Deterministic runtime disposal | `electron/services/conversation-runtime.ts:72` (`dispose()`), `electron/services/conversation-registry.ts:29` (registry-side), `electron/main.ts:54` (app quit hook), `electron/services/conversation-service.ts:26` (per-conversation delete) |
| Runtime-local permission ask routing | `electron/preload.ts:26` (IPC signature), `electron/ipc/register.ts:96` (handler), `electron/services/agent-service.ts:34` (route through registry), `electron/services/agent-loop.ts:455` (`waitForConfirmation` method) |
| Skills tracked per-runtime | `electron/services/conversation-runtime.ts:138` (`addSkill`/`getSkillsContent`), `electron/services/chat-service.ts:72` (double-write site), `electron/services/agent-loop.ts:52` (read via runtime in `start()`) |
| AgentLoop decoupled from module globals | `electron/services/agent-loop.ts:1-13` (imports — no agent-shared Maps), `electron/services/agent-shared.ts` (Maps removed, only types/constants remain), `electron/services/agent-loop.ts:30` (`runtime` field) |
