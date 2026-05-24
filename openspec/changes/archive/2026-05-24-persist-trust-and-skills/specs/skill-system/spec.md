## MODIFIED Requirements

### Requirement: Conversation-level skill persistence
The system SHALL maintain a per-conversation skill tracking map that persists across application sessions via SQLite. When a `#skill-name` token is resolved for the first time in a conversation, the skill name SHALL be stored in the `conversation_skills` table. On subsequent messages in the same conversation, tracked skills SHALL be automatically re-injected without requiring the `#` token. On application restart, tracked skills SHALL be reloaded from the database and re-resolved from disk.

#### Scenario: Skill persists to next message
- **WHEN** user sends "#frontend-design 创建登录页" then sends "把按钮改成蓝色"
- **THEN** the second message SHALL still have `frontend-design` skill content injected into the agent context

#### Scenario: Accumulate multiple skills over time
- **WHEN** user sends "#frontend-design 做UI" then sends "#openspec-explore 想想架构"
- **THEN** both `frontend-design` and `openspec-explore` SHALL be injected into the agent context for the second message and any subsequent messages

#### Scenario: Duplicate skill ignored
- **WHEN** user sends "#frontend-design 做A" then sends "#frontend-design 做B"
- **THEN** the skill SHALL NOT be injected twice; the existing tracking entry SHALL be unchanged

#### Scenario: Tracking persists across app restart
- **WHEN** the app restarts and the user reopens a conversation that had tracked skills
- **THEN** the tracked skills SHALL be reloaded from SQLite and re-injected into subsequent agent runs

#### Scenario: Tracking cleared on conversation deletion
- **WHEN** the conversation is deleted
- **THEN** the tracking entries for that conversation SHALL be cleared from both the in-memory map and the database
