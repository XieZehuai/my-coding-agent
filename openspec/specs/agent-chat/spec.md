## ADDED Requirements

### Requirement: Send message to agent
The system SHALL allow users to type a message and send it to the AI agent. The message SHALL be saved to the database and the agent loop SHALL begin processing.

#### Scenario: Send a text message
- **WHEN** user types "帮我重构 src/utils.ts" and presses Enter
- **THEN** the message SHALL appear in the chat window as a user bubble, and the agent SHALL begin processing

### Requirement: Streaming token display
The system SHALL display AI responses token-by-token as they stream from the API, creating a real-time typing effect in the chat window.

#### Scenario: Tokens appear progressively
- **WHEN** the API streams response tokens
- **THEN** each token SHALL appear in the chat window as it arrives, appending to the current assistant message

### Requirement: Cancel in-progress send
The system SHALL allow users to cancel an ongoing agent loop. Cancellation SHALL stop further API calls and tool executions but SHALL NOT automatically revert any completed file changes.

#### Scenario: Cancel during agent loop
- **WHEN** user clicks the "Cancel" button during an active agent response
- **THEN** the agent loop SHALL abort, a "cancelled" status SHALL be shown, and completed tool operations SHALL remain as-is

### Requirement: Retry on API error
The system SHALL automatically retry failed API calls when the error is a server error (5xx) or rate limit (429). The retry count SHALL be configurable in `.agents/config.toml` in the range [0, 5], where 0 means no retry and values above 5 SHALL be capped at 5.

#### Scenario: Retry on 429 rate limit
- **WHEN** the API returns HTTP 429
- **THEN** the system SHALL wait and retry up to the configured number of times before reporting failure

#### Scenario: No retry when configured to 0
- **WHEN** the API returns an error and retry is set to 0
- **THEN** the system SHALL immediately report the error without retrying

### Requirement: @File reference autocomplete
The system SHALL support typing `@` in the message input to trigger file path autocomplete within the current project. Selecting a file SHALL insert a `@file:` reference that includes the file content in the context when sent.

#### Scenario: @ triggers file search
- **WHEN** user types `@src` in the input box
- **THEN** a dropdown SHALL appear showing matching files in the project; selecting one inserts `@file:src/...`

#### Scenario: @file content included in context
- **WHEN** user sends a message containing `@file:src/utils.ts`
- **THEN** the content of `src/utils.ts` SHALL be included in the API request context before the user message

### Requirement: Empty input prevention
The system SHALL disable the send button when the input is empty or contains only whitespace.

#### Scenario: Send button disabled on empty input
- **WHEN** the input box is empty
- **THEN** the send button SHALL be disabled

### Requirement: Command prefix interception
The system SHALL detect `/`-prefixed messages and SHALL resolve them against the command registry before sending to the AI agent. Built-in commands SHALL execute locally; custom commands SHALL augment the context with a system instruction; unrecognized commands SHALL be sent to the AI as-is.

#### Scenario: Built-in command intercepted and executed locally
- **WHEN** user sends `/config`
- **THEN** the message SHALL NOT be sent to the AI; the command SHALL execute locally and return a result message

#### Scenario: Custom command augments agent context
- **WHEN** user sends `/git-commit`
- **THEN** the agent loop SHALL start with the COMMAND.md content injected as an additional system message

### Requirement: Custom prompt in agent context
The `AgentRunOptions` SHALL support an optional `customPrompt` field. When set, the prompt text SHALL be inserted as the first system message before the regular system prompt and project context.

#### Scenario: Custom prompt injected into agent context
- **WHEN** a custom command provides a COMMAND.md prompt
- **THEN** the agent's message array SHALL begin with `{ role: "system", content: "<COMMAND.md>" }` followed by the regular system prompt

### Requirement: Configurable max turns
The maximum agent loop turns SHALL be read from `config.maxTurns` in `.agents/config.toml`, defaulting to 50 when not configured.

#### Scenario: max_turns from config
- **WHEN** `.agents/config.toml` contains `max_turns = 30`
- **THEN** the agent loop SHALL run at most 30 turns

#### Scenario: max_turns default
- **WHEN** `.agents/config.toml` does not configure `max_turns`
- **THEN** the agent loop SHALL use the default value of 50
