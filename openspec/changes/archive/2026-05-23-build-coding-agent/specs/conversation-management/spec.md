## ADDED Requirements

### Requirement: Create conversation
The system SHALL allow users to create a new conversation within a selected project. A new conversation SHALL have the default title "未命名" and be immediately selectable.

#### Scenario: Create conversation in project
- **WHEN** user selects a project and clicks "New Conversation"
- **THEN** a new conversation titled "未命名" SHALL appear in the conversation list and be automatically selected

### Requirement: List conversations in project
The system SHALL display all conversations belonging to the selected project, ordered by most recently active.

#### Scenario: Switch project updates conversation list
- **WHEN** user selects a different project
- **THEN** the conversation list SHALL update to show only that project's conversations

### Requirement: Delete conversation
The system SHALL allow users to delete a conversation. Deletion SHALL remove the conversation, all its messages, and all associated undo backup files.

#### Scenario: Delete conversation with confirmation
- **WHEN** user right-clicks a conversation and selects "Delete"
- **THEN** a confirmation dialog SHALL appear; upon confirmation, the conversation, its messages, and its backup files SHALL be permanently removed

### Requirement: Rename conversation
The system SHALL allow users to rename a conversation by editing its title in-place.

#### Scenario: Double-click to rename
- **WHEN** user double-clicks a conversation title in the sidebar
- **THEN** the title SHALL become an editable text field; pressing Enter SHALL save the new title

### Requirement: AI-generated conversation title
After the first complete assistant response in a conversation, the system SHALL automatically generate a title by sending a lightweight API request asking the AI to summarize the conversation in 15 characters or fewer.

#### Scenario: Title generated after first response
- **WHEN** the agent completes its first response in a conversation
- **THEN** the system SHALL request a title summary and update the conversation title automatically

#### Scenario: User manually renamed title takes precedence
- **WHEN** user has already manually renamed a conversation
- **THEN** the system SHALL NOT overwrite the user-set title with an AI-generated one
