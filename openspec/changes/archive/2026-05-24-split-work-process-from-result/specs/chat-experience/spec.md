## MODIFIED Requirements

### Requirement: Message transcript hierarchy
The chat UI SHALL render conversation messages with clear role identity, readable grouping, and message metadata suitable for scanning a coding-agent transcript. Assistant messages SHALL display a work process section (collapsed by default) and a result section (always visible), with a duration badge in the header.

#### Scenario: User and assistant messages are visually distinguishable
- **WHEN** a conversation contains both user and assistant messages
- **THEN** the UI shows each message with role-specific visual treatment and a visible role label

#### Scenario: Message time and duration are visible
- **WHEN** a message has a creation timestamp
- **THEN** the UI shows a compact time indicator. For assistant messages, an elapsed duration SHALL also be shown.

#### Scenario: Markdown content remains readable
- **WHEN** a message contains markdown content such as code blocks, inline code, lists, tables, links, or blockquotes
- **THEN** the UI renders those elements with spacing, borders, and contrast that preserve readability within the message panel

#### Scenario: Assistant message shows work process and result split
- **WHEN** an assistant message completes streaming and contains both work process and result sections
- **THEN** the work process section SHALL be collapsed by default with a step count header, and the result section SHALL be always visible

## MODIFIED Requirements

### Requirement: Streaming assistant feedback
The chat UI SHALL provide distinct feedback while the assistant is actively responding. During streaming, reasoning segments SHALL render interleaved with text and tool call segments in the live streaming panel.

#### Scenario: Assistant is waiting before text arrives
- **WHEN** the assistant response is streaming but no text or tool segment has arrived yet
- **THEN** the UI shows an in-progress assistant panel with a waiting indicator and a live elapsed time counter

#### Scenario: Assistant text is streaming
- **WHEN** streaming text segments are present
- **THEN** the UI renders the partial assistant response and shows an active cursor or equivalent live indicator

#### Scenario: Reasoning streams interleaved
- **WHEN** reasoning tokens arrive during streaming, potentially interleaved with text and tool calls
- **THEN** the UI renders reasoning segments as collapsible thinking blocks in their chronological position within the streaming panel, open by default while live

#### Scenario: Tool execution streams inline
- **WHEN** a tool call starts, completes, or fails during streaming
- **THEN** the UI updates the inline tool card with running, done, or error status using stable labels and visual indicators

#### Scenario: Live elapsed time displayed
- **WHEN** the assistant is actively streaming
- **THEN** the streaming panel header SHALL display a live elapsed time counter
