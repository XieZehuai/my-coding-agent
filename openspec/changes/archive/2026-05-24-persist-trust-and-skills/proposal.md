## Why

Trust mode and skill tracking are currently stored only in in-memory Maps, so they are lost every time the app restarts. Users must re-enable trust mode for each conversation and re-reference `#skills` in each session, creating unnecessary friction and inconsistent agent behavior across restarts.

## What Changes

- **Trust mode persistence**: Add `trust_mode` column to the `conversations` SQLite table. Trust mode toggled per conversation survives app restart and reloads automatically.
- **Skill tracking persistence**: Add `conversation_skills` SQLite table storing `(conv_id, name)`. Tracked skills (`#skillName`) survive restart; on agent run, skills are re-resolved from disk using the persisted name.
- **Export/import coverage**: Conversation export/import format includes `trustMode` and `skills` fields so these are preserved when sharing conversations across instances.

## Capabilities

### New Capabilities

*(none — this change extends existing capabilities)*

### Modified Capabilities

- `data-persistence`: SQLite schema extended with `trust_mode` column on `conversations` and new `conversation_skills` table; export/import format includes `trustMode` and `skills`
- `permission-system`: Trust mode state persists across application restarts (previously lost on restart)
- `skill-system`: Skill tracking per conversation persists across restarts via SQLite; the requirement "tracking cleared on restart" is reversed

## Impact

- **Database**: schema migration for existing databases (`ALTER TABLE conversations ADD COLUMN trust_mode`; new `conversation_skills` table)
- **electron/services/agent-shared.ts**: `convTrustMode` Map loading/saving wired to DB
- **electron/services/skill-tracker.ts**: `get()` lazily loads from DB, `add()` writes to DB
- **electron/services/agent-service.ts**: `setTrustMode()` writes to DB
- **electron/db/**: new `skills.ts`, modified `conversations.ts`, migration in `connection.ts`
- **electron/db/conversations.ts**: `listConversations` includes `trust_mode`, new `setConversationTrustMode`
- **src/stores/trustMode.ts**: load trust modes when conversations load (API-driven, store unchanged)
- **src/stores/conversation.ts**: populate trustModeMap from conversation data
- **Export/import**: `buildExportData` and `importConversationFromFile` updated with trust_mode and skills
