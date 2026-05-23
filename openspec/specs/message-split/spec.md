## ADDED Requirements

### Requirement: Reasoning as interleaved segment
The renderer-side segment model SHALL treat reasoning content as first-class segments interleaved with text and tool call segments. Reasoning SHALL preserve the exact output order from the model, rather than being collected into a separate blob.

#### Scenario: Streaming produces interleaved segments
- **WHEN** the model outputs reasoning tokens, then text tokens, then a tool call, then more reasoning tokens, then final text
- **THEN** the segment array SHALL contain reasoning, text, tool_call, reasoning, text in that exact order

#### Scenario: Reasoning segments are visually distinct
- **WHEN** a message contains reasoning segments
- **THEN** each reasoning segment SHALL render as a collapsible "Thinking" block within the work process section

### Requirement: Work process and result split
After an assistant message completes streaming, the system SHALL split its segments into a work process section and a result section. The split point SHALL be determined by scanning segments from the end: contiguous trailing text segments are the result; everything before (including reasoning, intermediate text, and all tool calls) is the work process.

#### Scenario: Message with tools and trailing text
- **WHEN** an assistant message has segments [reasoning, text, tool_call, reasoning, text, tool_call, text]
- **THEN** the final text segment SHALL be the result, and all preceding segments SHALL be the work process

#### Scenario: Message with only text
- **WHEN** an assistant message has only text segments with no tool calls
- **THEN** the entire segment list SHALL be the result, and no work process section SHALL be displayed

#### Scenario: Message with tools but no trailing text
- **WHEN** an assistant message ends with a tool call or reasoning segment with no trailing text
- **THEN** all segments SHALL be the work process, and the result section SHALL show a compact "Working..." placeholder or be absent

### Requirement: Work process collapsed by default
The work process section SHALL be collapsed when a completed assistant message first renders. The user SHALL be able to click a toggle to expand or collapse the work process section.

#### Scenario: Message first rendered after streaming completes
- **WHEN** an assistant message finishes streaming and renders with a work process section
- **THEN** the work process section SHALL be collapsed, showing only a summary header with step count

#### Scenario: User expands work process
- **WHEN** the user clicks the collapsed work process header
- **THEN** the work process section SHALL expand, revealing reasoning blocks, intermediate text, and tool call cards in chronological order

#### Scenario: User collapses work process
- **WHEN** the user clicks the expanded work process header
- **THEN** the work process section SHALL collapse back to the summary header

### Requirement: Result section always visible
The result section SHALL always be visible for completed assistant messages, regardless of work process collapse state.

#### Scenario: Message with both work process and result
- **WHEN** a completed assistant message has both work process and result sections
- **THEN** the result text SHALL be visible even when the work process is collapsed

### Requirement: Per-response duration timing
The system SHALL record the start time when streaming begins and compute the elapsed duration when streaming completes. The total duration SHALL be displayed on the assistant message.

#### Scenario: Duration displayed after completion
- **WHEN** streaming completes for an assistant message
- **THEN** the message header SHALL display the total elapsed time in a human-readable format (e.g., "3.2s")

#### Scenario: Duration during streaming
- **WHEN** the assistant is actively streaming a response
- **THEN** the streaming panel SHALL show a live elapsed time counter that updates in real-time

#### Scenario: Multiple responses have independent timing
- **WHEN** the user sends two messages in sequence, each receiving an assistant response
- **THEN** each assistant message SHALL display its own independent duration

### Requirement: History message compatibility
When loading persisted messages from the database, the system SHALL convert the legacy `reasoningContent` field into a reasoning segment placed at the start of the segment list. This SHALL provide a reasonable fallback for messages that predate interleaved reasoning.

#### Scenario: Loading a conversation with legacy messages
- **WHEN** the renderer loads a conversation containing messages with `reasoningContent` but no reasoning segments
- **THEN** the reasoning content SHALL be prepended as a single reasoning segment at the beginning of the segment list

#### Scenario: Loading a conversation with new-format messages
- **WHEN** the renderer loads a conversation where messages already have reasoning segments (from future backend interleaving support)
- **THEN** the segments SHALL be rendered as-is with no duplication
