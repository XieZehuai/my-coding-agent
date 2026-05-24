## Context

Trust mode and skill tracking are currently held in in-memory `Map<string, ...>` objects (`convTrustMode` in `agent-shared.ts`, `conversationSkills` in `skill-tracker.ts`). Both are lost on app restart. The SQLite database already stores projects, conversations, messages, and undo state — this change extends persistence to the two remaining conversation-scoped data types.

## Goals / Non-Goals

**Goals:**
- Trust mode per conversation persists across app restarts
- Tracked skills per conversation persist across app restarts
- Conversation export/import includes trust mode and skills
- Existing databases are migrated without data loss

**Non-Goals:**
- Persisting agent runtime state (streaming, tool logs, round count) — these are ephemeral by nature
- Persisting permission confirmations — these contain live Promise resolvers
- Persisting UI-local state (input text, dropdown visibility, expand/collapse) — meaningless across sessions
- Schema versioning system — not needed yet; use simple ALTER TABLE with try/catch

## Decisions

### 1. Trust mode: Column on `conversations` table

```
ALTER TABLE conversations ADD COLUMN trust_mode INTEGER NOT NULL DEFAULT 0;
```

**Chosen over:** Separate `conversation_settings` table.

**Rationale:** A single boolean per conversation does not warrant a separate table. Adding one column to `conversations` keeps queries simple (no JOIN needed) and matches the existing pattern of conversation-level fields. If more per-conversation settings emerge later, migrating to a settings table can be done at that point.

### 2. Skills: Store name only, re-resolve from disk

```
CREATE TABLE conversation_skills (
  conv_id  TEXT NOT NULL,
  name     TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (conv_id, name),
  FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

**Chosen over:** Storing the full `content` of SKILL.md.

**Rationale:** The skill name (e.g., `"frontend-design"`) is the stable identifier. SKILL.md content can change between app launches as users update skill definitions. Re-resolving from disk on each agent run ensures the latest version is always used, while still remembering *which* skills were activated. This also keeps the database minimal — each row is ~50 bytes vs ~5KB.

### 3. Trust mode loading: Piggyback on conversation list

The existing `listConversations()` query returns `Conversation[]`. Adding `trust_mode` to the SELECT means the frontend receives it as part of the conversation data it already fetches. The `useConversationStore` populates `trustModeMap` when conversations load.

No additional IPC call needed. On conversation switch, trust mode is already available from the list.

**Fallback:** If a conversation's trust mode is not in the frontend cache (edge case: direct link), `getAgentStatus()` can return it, or a dedicated `getConversation()` call includes it.

### 4. Skills loading: Lazy (on-demand from DB)

`skillTracker.get(convId)` is called at agent start. After this change:

1. Check `conversationSkills` Map (in-memory cache)
2. If miss, query `conversation_skills` table for `conv_id`
3. For each name, call `resolveSkill(projectPath, name)` to get content from disk
4. Populate Map with resolved entries
5. Return the list

This avoids loading skills for conversations that aren't currently active. The `resolveSkill` call already exists and can fail gracefully (returns `null` for deleted skills).

### 5. Export/import format extension

Current export includes `{ version, project, conversation: { title, messages } }`. Extended:

```json
{
  "version": 2,
  "conversation": {
    "title": "...",
    "trustMode": false,
    "skills": ["frontend-design"],
    "messages": [...]
  }
}
```

On import (v1 or v2):
- `trustMode`: set for the new conversation
- `skills`: saved to `conversation_skills` table (names only — content is resolved from the importing instance's disk)

Backward compatible: v1 imports work as before (trustMode defaults to false, no skills).

### 6. Migration approach

Follow the existing pattern in `connection.ts:initSchema()`:
- `CREATE TABLE IF NOT EXISTS conversation_skills (...)` — safe to run every time
- `ALTER TABLE conversations ADD COLUMN trust_mode INTEGER NOT NULL DEFAULT 0` — wrapped in try/catch for databases that already have the column

No separate migration framework — consistent with how `reasoning_content` was added previously (lines 54-59).

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skill directory deleted after skill was tracked | `resolveSkill()` returns null → skill silently skipped | Log a warning; don't block agent execution |
| `ALTER TABLE` fails on locked DB | Migration skipped, app runs without persistence | Wrapped in try/catch; column existence is idempotent |
| Export format v2 not readable by older versions | Old app rejects import | Acceptable — import was v1-only before; v2 is additive |
| Conversation deleted but skills rows survive (no CASCADE on some SQLite configs) | Orphan rows in `conversation_skills` | `PRAGMA foreign_keys = ON` already set in `getDb()`; manually clean in `deleteConversation()` as belt-and-suspenders |

## Open Questions

1. **Should the frontend `trustModeMap` be a Pinia store state, or should we rely solely on the conversation object field?** Current architecture uses both. Simplest approach: keep both; populate store from conversation data on load; store is authoritative during session, DB is source of truth on restart.
2. **When a skill file is missing at resolve time, should we remove it from the DB?** Probably not — the file might come back (e.g., after a `git pull`). Just skip with a warning.
