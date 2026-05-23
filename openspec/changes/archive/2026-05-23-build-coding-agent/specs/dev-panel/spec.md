## ADDED Requirements

### Requirement: Context window monitoring
The system SHALL monitor the token usage of the current conversation context and display it in the developer panel as a percentage of the maximum context window.

#### Scenario: Display token usage
- **WHEN** the developer panel is open during an active conversation
- **THEN** the current token usage percentage SHALL be visible and update in real-time

### Requirement: Automatic context compression
When the token usage exceeds 90% of the context window, the system SHALL automatically compress the context. Compression SHALL keep the system prompt and last 10 message turns, then summarize earlier content into a `<memory>` block.

#### Scenario: Trigger compression at 90%
- **WHEN** token usage reaches 90% of the context window
- **THEN** the system SHALL compress the context and insert a summary `<memory>` block after the system prompt

#### Scenario: Compression status in dev panel
- **WHEN** context compression occurs
- **THEN** the developer panel SHALL log the compression event with before/after token counts

### Requirement: Agent loop status display
The developer panel SHALL display the current agent loop round number, total rounds completed, and whether the agent is currently streaming, executing tools, or idle.

#### Scenario: Show active agent status
- **WHEN** the agent is actively streaming a response
- **THEN** the dev panel SHALL show "Streaming" status and the current round number

### Requirement: Tool execution log
The developer panel SHALL display a log of recent tool executions, including tool name, target, execution time, and result status (success/error/timeout).

#### Scenario: Tool execution logged
- **WHEN** the agent executes `read_file("src/utils.ts")`
- **THEN** the dev panel SHALL show a log entry with the tool name, target path, duration, and result

### Requirement: Developer panel toggle
The system SHALL provide a toggle to show and hide the developer panel. The panel SHALL be hidden by default.

#### Scenario: Open dev panel
- **WHEN** user clicks the dev panel toggle button
- **THEN** the developer panel SHALL slide open at the bottom of the window
