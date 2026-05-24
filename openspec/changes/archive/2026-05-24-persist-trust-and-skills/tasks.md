## 1. Database Schema

- [x] 1.1 Add `conversation_skills` table to `initSchema()` in `electron/db/connection.ts`
- [x] 1.2 Add `trust_mode` column migration to `initSchema()` in `electron/db/connection.ts` (ALTER TABLE with try/catch)
- [x] 1.3 Create `electron/db/skills.ts` with `saveConversationSkill()`, `getConversationSkillNames()`, `deleteConversationSkills()` functions

## 2. Trust Mode Persistence

- [x] 2.1 Add `setConversationTrustMode(convId, enabled)` and `getConversationTrustMode(convId)` to `electron/db/conversations.ts`
- [x] 2.2 Modify `listConversations()` in `electron/db/conversations.ts` to include `trust_mode` in the SELECT and returned type
- [x] 2.3 Update `Conversation` type in `shared/types.ts` to include `trustMode?: boolean`
- [x] 2.4 Modify `setTrustMode()` in `electron/services/agent-service.ts` to write to DB in addition to the in-memory Map
- [x] 2.5 Update frontend `useTrustModeStore` and `useConversationStore` to populate `trustModeMap` from conversation data on load

## 3. Skills Persistence

- [x] 3.1 Modify `skillTracker.add()` in `electron/services/skill-tracker.ts` to write to DB via `saveConversationSkill()`
- [x] 3.2 Modify `skillTracker.get()` to lazily load from DB when the in-memory Map is empty, then re-resolve content from disk
- [x] 3.3 Modify `skillTracker.clear()` to also delete from DB via `deleteConversationSkills()`
- [x] 3.4 Update `skillTracker.get()` signature and callers to pass `projectPath` for disk resolution
- [x] 3.5 Update agent loop in `electron/services/agent-loop.ts` if needed after `skillTracker.get()` signature change

## 4. Export / Import

- [x] 4.1 Bump export version to 2 in `electron/services/conversation-service.ts`
- [x] 4.2 Include `trustMode` in `buildExportData()` output
- [x] 4.3 Include `skills` (skill names) in `buildExportData()` output
- [x] 4.4 Handle `trustMode` and `skills` fields in `importConversationFromFile()` for v2 imports, with v1 fallback

## 5. Cleanup & Verify

- [x] 5.1 Ensure `deleteConversation()` in `electron/services/conversation-service.ts` cleans up `conversation_skills` rows
- [x] 5.2 Run TypeScript typecheck (`npm run typecheck`) and fix any issues
- [ ] 5.3 Manual smoke test: toggle trust mode, restart app, verify it persists
- [ ] 5.4 Manual smoke test: reference `#skill`, restart app, send follow-up message, verify skill is re-injected
- [ ] 5.5 Manual smoke test: export conversation with trust mode + skills, import into fresh project, verify both are restored
