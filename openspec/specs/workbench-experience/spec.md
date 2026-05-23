## ADDED Requirements

### Requirement: Cohesive workbench shell
The renderer SHALL present the app as a cohesive coding workbench with a navigation zone and a primary conversation workspace.

#### Scenario: Main layout presents navigation and conversation workspace
- **WHEN** the app is loaded
- **THEN** the UI shows a persistent navigation/workspace zone and a primary conversation workspace

#### Scenario: Chat remains central
- **WHEN** a conversation is selected
- **THEN** the conversation workspace remains the dominant interaction area and is not displaced by diagnostics or navigation chrome

#### Scenario: Workbench uses restrained visual styling
- **WHEN** workbench shell elements render
- **THEN** they use compact, utilitarian styling suitable for repeated coding work

### Requirement: Workspace navigation clarity
The workbench SHALL make project and conversation navigation clear, dense, and easy to scan.

#### Scenario: Selected project is visible
- **WHEN** a project is selected
- **THEN** the navigation area visually distinguishes the selected project from other projects

#### Scenario: Selected conversation is visible
- **WHEN** a conversation is selected
- **THEN** the navigation area visually distinguishes the selected conversation from other conversations

#### Scenario: Empty project state guides the user
- **WHEN** no project exists
- **THEN** the navigation area shows a concise empty state that explains how to add a project

#### Scenario: Empty conversation state guides the user
- **WHEN** a project is selected but has no conversations
- **THEN** the navigation area shows a concise empty state that explains how to start a conversation

### Requirement: Conversation context header
The workbench SHALL show selected conversation context in the main workspace header.

#### Scenario: Header shows selected conversation
- **WHEN** a conversation is selected
- **THEN** the main workspace header shows the conversation title

#### Scenario: Header shows project context
- **WHEN** a project and conversation are selected
- **THEN** the main workspace header shows compact project context near the conversation title

#### Scenario: Long titles remain contained
- **WHEN** project or conversation names are long
- **THEN** the header truncates or wraps them without overlapping status controls

### Requirement: Compact agent status chrome
The workbench SHALL expose compact agent activity and token usage outside the full developer panel.

#### Scenario: Agent status is available
- **WHEN** agent status data is available
- **THEN** the workbench shows a compact status summary including agent state and token usage

#### Scenario: Agent is running
- **WHEN** the agent is actively processing a request
- **THEN** the workbench status chrome indicates active work

#### Scenario: Token usage approaches limit
- **WHEN** token percentage crosses warning or danger thresholds
- **THEN** the compact status chrome visually distinguishes the warning or danger state

### Requirement: Permission posture visibility
The workbench SHALL make the current conversation's permission posture visible near the conversation context.

#### Scenario: Trust mode is disabled
- **WHEN** trust mode is disabled for the selected conversation
- **THEN** the workbench shows an explicit non-trusted or baseline permission posture

#### Scenario: Trust mode is enabled
- **WHEN** trust mode is enabled for the selected conversation
- **THEN** the workbench shows an explicit trusted posture with active visual treatment

#### Scenario: Permission prompt appears
- **WHEN** a permission prompt is pending
- **THEN** the workbench keeps the permission request prominent and does not hide it behind diagnostics chrome

### Requirement: Integrated diagnostics drawer
The workbench SHALL present developer diagnostics as an integrated drawer instead of an unrelated floating panel.

#### Scenario: Diagnostics drawer opens
- **WHEN** the user opens diagnostics
- **THEN** the diagnostics area appears as a drawer connected to the workbench layout

#### Scenario: Diagnostics drawer closes
- **WHEN** the user closes diagnostics
- **THEN** the drawer collapses and returns focus to the conversation workspace

#### Scenario: Diagnostics include core status
- **WHEN** diagnostics are open
- **THEN** they show token usage, agent state, round, and recent tool execution logs

#### Scenario: Diagnostics do not block chat
- **WHEN** diagnostics are closed
- **THEN** they do not obscure the message list or input composer
