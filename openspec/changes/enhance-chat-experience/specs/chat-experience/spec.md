## ADDED Requirements

### Requirement: Message transcript hierarchy
The chat UI SHALL render conversation messages with clear role identity, readable grouping, and message metadata suitable for scanning a coding-agent transcript.

#### Scenario: User and assistant messages are visually distinguishable
- **WHEN** a conversation contains both user and assistant messages
- **THEN** the UI shows each message with role-specific visual treatment and a visible role label

#### Scenario: Message time is visible
- **WHEN** a message has a creation timestamp
- **THEN** the UI shows a compact time indicator with the message metadata

#### Scenario: Markdown content remains readable
- **WHEN** a message contains markdown content such as code blocks, inline code, lists, tables, links, or blockquotes
- **THEN** the UI renders those elements with spacing, borders, and contrast that preserve readability within the message panel

### Requirement: Tool call execution cards
The chat UI SHALL render tool calls as compact execution cards with status, preview, and expandable details for arguments and outputs.

#### Scenario: Tool call summary is scannable
- **WHEN** a message segment contains a tool call
- **THEN** the UI shows the tool name, status indicator, status label, and argument preview without requiring expansion

#### Scenario: Tool call details can be inspected
- **WHEN** a user expands a tool call card
- **THEN** the UI shows formatted arguments and any available result or error content

#### Scenario: Tool call errors are immediately visible
- **WHEN** a tool call has an error status
- **THEN** the UI opens or emphasizes the error details so the failure is visible without extra searching

### Requirement: Streaming assistant feedback
The chat UI SHALL provide distinct feedback while the assistant is actively responding.

#### Scenario: Assistant is waiting before text arrives
- **WHEN** the assistant response is streaming but no text or tool segment has arrived yet
- **THEN** the UI shows an in-progress assistant panel with a waiting indicator

#### Scenario: Assistant text is streaming
- **WHEN** streaming text segments are present
- **THEN** the UI renders the partial assistant response and shows an active cursor or equivalent live indicator

#### Scenario: Tool execution streams inline
- **WHEN** a tool call starts, completes, or fails during streaming
- **THEN** the UI updates the inline tool card with running, done, or error status using stable labels and visual indicators

### Requirement: Input composer usability
The chat UI SHALL present the bottom input as a stable multi-line composer suitable for coding-agent prompts.

#### Scenario: Composer defaults to five lines
- **WHEN** a conversation is selected and the input is empty
- **THEN** the input composer displays a multi-line textarea equivalent to five rows

#### Scenario: Composer communicates readiness
- **WHEN** the selected conversation or streaming state changes
- **THEN** the composer shows a compact status label such as ready, file search, no conversation selected, or agent responding

#### Scenario: Composer actions remain stable
- **WHEN** the user types multiple lines or the assistant is streaming
- **THEN** the send or cancel action remains visible and consistently positioned relative to the composer

#### Scenario: File autocomplete is readable
- **WHEN** file autocomplete results are shown
- **THEN** the dropdown uses stable file/directory markers and readable spacing without relying on HTML entity rendering

### Requirement: Explicit trust mode state
The chat UI SHALL show trust mode as explicit text state rather than relying on an ambiguous icon-only control.

#### Scenario: Trust mode is off
- **WHEN** trust mode is disabled for the selected conversation
- **THEN** the header control displays an explicit `Trust Off` state

#### Scenario: Trust mode is on
- **WHEN** trust mode is enabled for the selected conversation
- **THEN** the header control displays an explicit `Trust On` state with active visual treatment

### Requirement: Stable status text rendering
The chat UI SHALL avoid mojibake-prone or entity-only status strings in the chat surface.

#### Scenario: Tool statuses render as text labels
- **WHEN** tool execution status is displayed
- **THEN** the UI uses stable text labels such as `Running`, `Done`, and `Error`

#### Scenario: Chat controls avoid raw entities
- **WHEN** the chat surface renders icons or small markers
- **THEN** the UI uses CSS markers or plain text instead of Vue-interpolated HTML entity strings
