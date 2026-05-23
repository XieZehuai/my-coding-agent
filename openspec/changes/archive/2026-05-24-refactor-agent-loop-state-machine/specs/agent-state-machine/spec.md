## ADDED Requirements

### Requirement: Agent loop implemented as typed state machine
The agent loop SHALL be implemented as a finite state machine with the following states: `idle`, `streaming`, `compressing`, `executing_tools`, `waiting_user`, `completed`, `cancelled`, `error`. Each state SHALL have a dedicated handler method. State SHALL only change through a centralized `transition()` method that validates the transition.

#### Scenario: State machine starts on message send
- **WHEN** a user sends a chat message
- **THEN** the agent SHALL transition from `idle` to `streaming` after building initial context

#### Scenario: State progresses through tool execution
- **WHEN** the LLM returns tool calls during streaming
- **THEN** the agent SHALL transition from `streaming` to `executing_tools`

#### Scenario: State returns to streaming for next round
- **WHEN** all tool calls have been executed and the round limit is not exceeded
- **THEN** the agent SHALL transition from `executing_tools` back to `streaming` for the next round

#### Scenario: State ends naturally when LLM has no tool calls
- **WHEN** the LLM returns a response with no tool calls
- **THEN** the agent SHALL transition from `streaming` to `completed`

#### Scenario: State ends with warning on max turns
- **WHEN** the round count exceeds `maxTurns` after tool execution
- **THEN** the agent SHALL emit a max-turns warning token and transition to `completed`

### Requirement: Centralized abort handling
Abort signals SHALL be checked once at the top of the state dispatch loop. When the signal is aborted, the agent SHALL transition to `cancelled` regardless of current state.

#### Scenario: Cancel during streaming
- **WHEN** the user clicks cancel while the agent is in `streaming` state
- **THEN** the agent SHALL transition to `cancelled`, emit EVENT_CANCELLED, and stop processing

#### Scenario: Cancel during tool execution
- **WHEN** the user clicks cancel while the agent is in `executing_tools` state
- **THEN** the agent SHALL transition to `cancelled`, emit EVENT_CANCELLED, and stop further tool execution

#### Scenario: Cancel during compression
- **WHEN** the user clicks cancel while the agent is in `compressing` state
- **THEN** the agent SHALL transition to `cancelled`, emit EVENT_CANCELLED, and stop processing

### Requirement: Status emitted on every state transition
The system SHALL emit an `EVENT_STATUS` IPC event on every state transition. The payload SHALL use the `AgentState` union for the `state` field (not a loose `string`). This includes transitions that were previously not emitted: `executing_tools`, `waiting_user`, `cancelled`, `error`, `completed`.

#### Scenario: Status emitted when entering executing_tools
- **WHEN** the agent transitions from `streaming` to `executing_tools`
- **THEN** the renderer SHALL receive an `EVENT_STATUS` with `state: "executing_tools"`

#### Scenario: Status emitted when entering waiting_user
- **WHEN** a tool requires user permission confirmation
- **THEN** the renderer SHALL receive an `EVENT_STATUS` with `state: "waiting_user"`

#### Scenario: Status emitted on completion
- **WHEN** the agent finishes naturally (no tool calls or max turns)
- **THEN** the renderer SHALL receive an `EVENT_STATUS` with `state: "completed"`

### Requirement: Frontend state unification
The chat store SHALL track agent state as a single `AgentState` field rather than separate booleans (`isStreaming`, `isCancelled`, `error`). The active/running status SHALL be derived via a computed property: `isActive` evaluates `true` for `streaming`, `compressing`, `executing_tools`, and `waiting_user` states.

#### Scenario: isActive is true during streaming
- **WHEN** the agent state is `streaming`
- **THEN** `isActive` SHALL be `true`, showing the cancel button and hiding the send button

#### Scenario: isActive is false when idle
- **WHEN** the agent state is `idle` or `completed`
- **THEN** `isActive` SHALL be `false`, showing the send button and hiding the cancel button

#### Scenario: Cancelled state reflected without separate boolean
- **WHEN** the agent transitions to `cancelled`
- **THEN** the UI SHALL show a cancellation indicator (derived from `state === 'cancelled'`), and `isCancelled` boolean SHALL be removed

### Requirement: Shared AgentState type used end-to-end
The `AgentStatusSnapshot` in the main process and the `AgentStatus` in shared types SHALL both use the `AgentState` union for the `state` field. The `DevPanel.vue` component's local `DevStatus` interface SHALL be removed in favor of `AgentStatus` from shared types. The `isStreaming` boolean SHALL be derived from `state` instead of a standalone flag.

#### Scenario: Dev panel uses shared type
- **WHEN** the developer panel receives an agent status update
- **THEN** the `state` field SHALL be typed as `AgentState` from `shared/types.ts`, not as `string` or a local interface

#### Scenario: Status snapshot uses union type
- **WHEN** the main process creates an `AgentStatusSnapshot`
- **THEN** the `state` field SHALL be of type `AgentState`, not `string`
