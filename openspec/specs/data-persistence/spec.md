## ADDED Requirements

### Requirement: SQLite database initialization
The system SHALL create and manage a local SQLite database to persist projects, conversations, and messages. The database SHALL be created on first launch.

#### Scenario: Database created on first launch
- **WHEN** the application starts for the first time
- **THEN** a SQLite database file SHALL be created in the app's user data directory

### Requirement: Project persistence
The system SHALL store project records including id, name, local path, creation timestamp, and last activity timestamp.

#### Scenario: Project saved to database
- **WHEN** user adds a project by selecting a folder
- **THEN** the project SHALL be persisted to SQLite and survive application restart

### Requirement: Conversation persistence
The system SHALL store conversation records including id, associated project id, title, creation timestamp, and last activity timestamp.

#### Scenario: Conversation created and persisted
- **WHEN** user creates a new conversation in a project
- **THEN** the conversation SHALL be persisted to SQLite and appear in the sidebar after restart

### Requirement: Message persistence
The system SHALL store message records including id, associated conversation id, role (user/assistant/system/tool), content, tool calls (as JSON), tool call id, and creation timestamp.

#### Scenario: Messages saved during conversation
- **WHEN** a conversation occurs with user messages, assistant responses, and tool calls
- **THEN** all messages SHALL be persisted and SHALL be retrievable when reopening the conversation

### Requirement: Undo file backup
Before the agent writes to an existing file, the system SHALL back up the original file content to `.agents/backups/{conversationId}/`. New files created by the agent SHALL be tracked in a list without needing a backup.

#### Scenario: Backup created before file write
- **WHEN** the agent writes to `src/utils.ts` for the first time in a conversation
- **THEN** the original content SHALL be saved to `.agents/backups/{convId}/src/utils.ts`

#### Scenario: Backup not created for new files
- **WHEN** the agent creates a new file `src/new.ts` that did not previously exist
- **THEN** no backup SHALL be created; the file SHALL be added to the new-files tracking list

### Requirement: Undo execution
The system SHALL allow users to undo all file changes made during a conversation. Undo SHALL restore backed-up original files and delete newly created files.

#### Scenario: Undo restores modified files
- **WHEN** user triggers undo on a conversation that modified 3 files
- **THEN** all 3 files SHALL be restored to their original content from the backups

#### Scenario: Undo deletes new files
- **WHEN** user triggers undo on a conversation that created 2 new files
- **THEN** those 2 files SHALL be deleted

#### Scenario: Undo cleanup
- **WHEN** undo is completed
- **THEN** the backup directory for that conversation SHALL be cleaned up

### Requirement: Conversation export as JSON
The system SHALL allow users to export a conversation to a JSON file. The export SHALL include the project name and path, conversation title, and all messages with their roles, content, tool calls, and timestamps.

#### Scenario: Export conversation
- **WHEN** user exports a conversation
- **THEN** a JSON file SHALL be generated containing the complete conversation history

### Requirement: Conversation import from JSON
The system SHALL allow users to import a previously exported JSON file as a new conversation. The import SHALL reconstruct the conversation with all messages.

#### Scenario: Import conversation file
- **WHEN** user imports a valid conversation JSON file
- **THEN** a new conversation SHALL be created in the current project with all messages from the file

#### Scenario: Import invalid JSON
- **WHEN** user attempts to import an invalid or malformed JSON file
- **THEN** the system SHALL display an error message and not create a conversation
