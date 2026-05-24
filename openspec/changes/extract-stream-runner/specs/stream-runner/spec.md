## ADDED Requirements

### Requirement: StreamRunner encapsulates LLM streaming

The system SHALL provide a `StreamRunner` class that manages the LLM `chatStream` call, accumulates deltas for content, reasoning, and tool calls, and emits real-time IPC events (`EVENT_TOKEN`, `EVENT_REASONING`). The runner SHALL accept `messages`, `signal`, and `config` as inputs and return a structured `StreamResult` containing the accumulated content, reasoning content, and tool calls.

#### Scenario: StreamRunner accumulates streaming deltas

- **WHEN** `StreamRunner.run(messages, signal)` is called
- **THEN** the runner SHALL call `OpenAIClient.chatStream`, accumulate `content`, `reasoningContent`, and `toolCalls` via the stream callbacks, and return them in a `StreamResult` object

#### Scenario: StreamRunner emits tokens in real-time

- **WHEN** token deltas arrive during streaming
- **THEN** the runner SHALL emit `EVENT_TOKEN` and `EVENT_REASONING` IPC events for each delta, with the owning `convId` in the payload

#### Scenario: StreamRunner handles stream errors

- **WHEN** the `chatStream` call fails (API error, network error, abort)
- **THEN** the runner SHALL throw the error; the caller (AgentLoop) SHALL handle state transition to `cancelled` or `error`

#### Scenario: StreamRunner handles cancellation via signal

- **WHEN** the `signal` passed to `run()` is aborted during streaming
- **THEN** the underlying `fetch` call SHALL be aborted; the runner SHALL throw a cancellation error
