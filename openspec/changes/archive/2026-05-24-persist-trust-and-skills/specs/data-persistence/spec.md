## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Conversation persistence
The system SHALL store conversation records including id, associated project id, title, trust mode, creation timestamp, and last activity timestamp.

#### Scenario: Conversation created and persisted
- **WHEN** user creates a new conversation in a project
- **THEN** the conversation SHALL be persisted to SQLite and appear in the sidebar after restart

#### Scenario: Trust mode persisted with conversation
- **WHEN** user toggles trust mode on a conversation
- **THEN** the trust mode state SHALL be written to the SQLite conversations table and survive application restart
