## MODIFIED Requirements

### Requirement: Agent loop implemented as typed state machine

The agent loop SHALL be implemented as a finite state machine with the following states: `idle`, `streaming`, `compressing`, `executing_tools`, `waiting_user`, `completed`, `cancelled`, `error`. Each state SHALL have a dedicated handler method. State SHALL only change through a centralized `transition()` method. The streaming handler (`doStreaming`) SHALL delegate LLM communication to an injected `StreamRunner` rather than calling `OpenAIClient.chatStream` directly.

#### Scenario: State machine starts on message send

- **WHEN** a user sends a chat message
- **THEN** the agent SHALL transition from `idle` to `streaming` after building initial context

#### Scenario: Streaming state delegates to StreamRunner

- **WHEN** the agent enters `streaming` state
- **THEN** the handler SHALL call `streamRunner.run(ctx.messages, ctx.signal)` and process the returned `StreamResult` rather than calling `OpenAIClient.chatStream` directly

#### Scenario: State progresses through tool execution

- **WHEN** the LLM returns tool calls during streaming
- **THEN** the agent SHALL transition from `streaming` to `executing_tools`

#### Scenario: State returns to streaming for next round

- **WHEN** all tool calls have been executed and the round limit is not exceeded
- **THEN** the agent SHALL transition from `executing_tools` back to `streaming` for the next round

#### Scenario: State ends naturally when LLM has no tool calls

- **WHEN** the LLM returns a response with no tool calls
- **THEN** the agent SHALL invoke `onFirstTurnComplete` callback (if provided and this is the first assistant response), then transition from `streaming` to `completed`

#### Scenario: State ends with warning on max turns

- **WHEN** the round count exceeds `maxTurns` after tool execution
- **THEN** the agent SHALL emit a max-turns warning token and transition to `completed`
