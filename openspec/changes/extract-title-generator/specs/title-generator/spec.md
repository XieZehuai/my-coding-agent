## ADDED Requirements

### Requirement: Title generation is a standalone service

The system SHALL provide a `generateTitle(convId, projectPath, client?)` function in `electron/services/title-generator.ts` that generates a conversation title independently of the `AgentLoop` state machine. The function SHALL accept a conversation ID and use recent messages from the database to produce a title via LLM, persisting the result to the conversations table and emitting an IPC event.

#### Scenario: Title generated after first assistant response

- **WHEN** an agent loop completes its first turn with a text response (no tool calls)
- **THEN** the system SHALL invoke `generateTitle(convId, projectPath)` which reads the last 4 messages from the database, calls the LLM, writes the title to `conversations.title`, and emits `EVENT_TITLE_GENERATED`

#### Scenario: Title generation failure is non-critical

- **WHEN** the LLM call in `generateTitle` fails (network error, API error, timeout)
- **THEN** the function SHALL silently catch the error; the conversation title SHALL remain as `"未命名"`, and no error event SHALL be emitted

#### Scenario: Title truncated to 15 characters

- **WHEN** the LLM returns a title longer than 15 characters
- **THEN** the system SHALL truncate the title to 15 characters before persisting

#### Scenario: Title generation uses independent abort scope

- **WHEN** `generateTitle` is called while the main conversation loop has been cancelled
- **THEN** the title generation SHALL proceed independently using its own `AbortController`; it SHALL NOT be cancelled by the conversation's abort signal

### Requirement: AgentLoop delegates first-turn completion

The `AgentLoop` class SHALL NOT contain title generation logic. Instead, when the first streaming turn completes with no tool calls, the loop SHALL invoke an `onFirstTurnComplete` callback provided via `AgentRunOptions`. The callback is owned by the service layer (`chat-service`), which wires it to `generateTitle()`.

#### Scenario: AgentLoop calls onFirstTurnComplete

- **WHEN** `doStreaming()` completes with `toolCalls.length === 0` and `!hasAssistantResponse(this.ctx.history)`
- **THEN** the agent loop SHALL call `this.options.onFirstTurnComplete?.()` before emitting `EVENT_COMPLETE`

#### Scenario: AgentLoop works without onFirstTurnComplete

- **WHEN** `AgentRunOptions` does not provide an `onFirstTurnComplete` callback
- **THEN** the agent loop SHALL complete normally; the callback invocation SHALL be a no-op (optional chaining guard)
