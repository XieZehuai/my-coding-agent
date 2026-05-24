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
The system SHALL store conversation records including id, associated project id, title, trust mode, creation timestamp, and last activity timestamp.

#### Scenario: Conversation created and persisted
- **WHEN** user creates a new conversation in a project
- **THEN** the conversation SHALL be persisted to SQLite and appear in the sidebar after restart

#### Scenario: Trust mode persisted with conversation
- **WHEN** user toggles trust mode on a conversation
- **THEN** the trust mode state SHALL be written to the SQLite conversations table and survive application restart

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

### Requirement: Trust mode persistence
The system SHALL persist the trust mode state (enabled/disabled) for each conversation in the SQLite database. Trust mode SHALL survive application restart and SHALL be automatically restored when the conversation is reloaded.

#### Scenario: Trust mode survives restart
- **WHEN** user enables trust mode on a conversation, then restarts the application and reopens that conversation
- **THEN** trust mode SHALL still be enabled for that conversation

#### Scenario: Trust mode defaults to disabled
- **WHEN** a new conversation is created
- **THEN** trust mode SHALL default to disabled until the user explicitly enables it

### Requirement: Conversation skill persistence
The system SHALL persist tracked skill names per conversation in a `conversation_skills` SQLite table. Tracked skills SHALL survive application restart. When the agent runs for a conversation, saved skill names SHALL be re-resolved from disk.

#### Scenario: Tracked skills survive restart
- **WHEN** user references `#frontend-design` in a conversation, then restarts the application and reopens that conversation
- **THEN** `frontend-design` SHALL still be tracked and injected into the agent context for subsequent messages

#### Scenario: Skills cascade delete with conversation
- **WHEN** a conversation is deleted
- **THEN** all tracked skill records for that conversation SHALL be deleted

#### Scenario: Duplicate skill reference is idempotent
- **WHEN** user references the same `#skill-name` multiple times in one conversation
- **THEN** the skill SHALL be stored only once in the database

### Requirement: Export includes trust mode and skills
The system SHALL include `trustMode` (boolean) and `skills` (array of skill name strings) in the conversation export JSON format. The export version SHALL be incremented to 2.

#### Scenario: Export includes trust mode
- **WHEN** user exports a conversation with trust mode enabled
- **THEN** the JSON output SHALL contain `"trustMode": true` in the conversation object

#### Scenario: Export includes tracked skills
- **WHEN** user exports a conversation where `#frontend-design` was referenced
- **THEN** the JSON output SHALL contain `"skills": ["frontend-design"]` in the conversation object

### Requirement: Import restores trust mode and skills
The system SHALL restore `trustMode` and `skills` when importing a v2 conversation JSON file. For v1 imports without these fields, trust mode SHALL default to disabled and skills SHALL be empty.

#### Scenario: Import v2 with trust mode and skills
- **WHEN** user imports a v2 conversation JSON that has `trustMode: true` and `skills: ["frontend-design"]`
- **THEN** the new conversation SHALL have trust mode enabled and `frontend-design` SHALL be tracked

#### Scenario: Import v1 without trust mode and skills
- **WHEN** user imports a v1 conversation JSON without `trustMode` or `skills` fields
- **THEN** the new conversation SHALL have trust mode disabled and no tracked skills

### Requirement: Tool messages update conversation timestamp

The `saveToolMessage` function SHALL call `touchConversation(convId)` after inserting the tool message row, consistent with `saveUserMessage` and `saveAssistantMessage`, so that conversation activity tracking is uniform across all message types.

#### Scenario: Tool message touches conversation

- **WHEN** a tool message is saved via `saveToolMessage(convId, content, toolCallId, isError)`
- **THEN** the conversation's `updated_at` column SHALL be updated to the current timestamp

### Requirement: Conversation import routes through db layer

The `importConversationFromFile` function SHALL use `bulkInsertMessages` from `db/messages.ts` to insert imported messages rather than writing raw SQL. The `bulkInsertMessages` function SHALL handle ID generation, tool call normalization, `is_error` column, and transaction wrapping.

#### Scenario: Import uses db layer API

- **WHEN** a conversation is imported from a JSON file
- **THEN** message insertion SHALL occur via `bulkInsertMessages(convId, messages)`, and the service layer SHALL NOT contain SQL strings
