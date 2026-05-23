## Context

The codebase already has two trigger-based autocomplete patterns in `InputBox.vue`: `@` for file references and `/` for commands. Both follow the same architecture: frontend regex detection → IPC call → backend service → results returned → dropdown selection → text replacement.

Skills exist as `.agents/skills/<name>/SKILL.md` files with YAML frontmatter (`name`, `description`) and Markdown body content. They are currently unused by the application.

The `agent-service.ts` already supports injecting a `customPrompt` system message at the front of the context via `AgentRunOptions.customPrompt`, introduced by the command system. Skills will use the same mechanism, extended to support multiple contents.

## Goals / Non-Goals

**Goals:**
- `#` trigger in chat input autocompletes skill names with descriptions
- Selection inserts `#skill-name` into the input text
- On send, skill SKILL.md content is injected as system messages before the agent loop
- Multiple skills can be selected in one message (joined by spaces)
- Skills and commands can coexist in the same message (`#skill /cmd text`)
- Active skills persist across messages within a conversation — subsequent messages automatically inherit tracked skills without re-specifying `#`
- No breaking changes to existing `@` or `/` behavior

**Non-Goals:**
- Skill hot-reloading or watching the filesystem for changes
- Skill configuration UI (editing/managing skills)
- Validation of skill content beyond file existence

## Decisions

### 1. YAML Frontmatter Parsing: Manual (no new dependency)

**Decision**: Parse the `---` delimited YAML frontmatter manually with basic line-by-line key-value extraction for `name` and `description` only.

**Rationale**: Only two flat string fields are needed for the autocomplete dropdown. Nested `metadata` blocks are irrelevant to the UI. Adding a `yaml` or `js-yaml` dependency for two fields is over-engineering. The full SKILL.md content (including frontmatter) is passed as-is to the LLM, which handles it naturally.

**Alternatives considered**: `js-yaml` — rejected for minimal dependency surface. `yaml` (npm) — same reasoning.

### 2. `#` Triggers Autocomplete Only Before Cursor (not inline)

**Decision**: Mirror the existing `@` and `/` behavior exactly — regex `/^#([^\s]*)$/` on text before cursor.

**Rationale**: Consistency with existing triggers. Users expect the same trigger behavior across all three symbols. No additional composable or IPC needed beyond the new `skill:search` channel.

### 3. Skill Content Injected as Full SKILL.md

**Decision**: Pass the entire SKILL.md file content (YAML frontmatter + Markdown body) as the system message. Do not strip frontmatter.

**Rationale**: The LLM uses the frontmatter fields (`name`, `description`, `license`, `metadata`) as natural context to understand what the skill does. Stripping it loses information. This matches how `COMMAND.md` content is injected for custom commands — full file content, no stripping.

### 4. Injection Order: Skills Before Commands Before Base Prompt

**Decision**:
```
messages.unshift({ role: 'system', content: skillN })    // last skill
...
messages.unshift({ role: 'system', content: skill1 })    // first skill
messages.unshift({ role: 'system', content: customPrompt }) // command
// base system prompt + project tree already in messages
```

**Rationale**: Skills are "persona/capability" modifiers and should take highest priority in the instruction hierarchy. Commands are "task" modifiers and should come second. Base system prompt provides fallback constraints. This order means the LLM sees: skills (top priority) → command (task-specific) → base identity (fallback).

### 5. `AgentRunOptions` Interface — No Change

**Decision**: Do NOT add `skillContents` to `AgentRunOptions`. Skills are tracked in a shared `Map<convId, { name, content }[]>` that both `chat-service` (write) and `agent-service` (read) access.

**Rationale**: Skills are session-persistent — once activated, they apply to all subsequent messages in the conversation. Passing them through the options on every call is redundant. The shared tracking map is the single source of truth. `customPrompt` (commands) remains on `AgentRunOptions` because commands are one-shot.

### 6. `#` Token Parsing in Chat Service

**Decision**: Add `parseSkillReferences(content: string): { skillNames: string[], cleanContent: string }` that extracts `#skill-name` tokens using regex `/#([a-zA-Z0-9_-]+)/g`. Remove these tokens from the user message before sending.

**Rationale**: The user shouldn't see raw `#skill-name` in their message history (it's a control token, not message content), but the LLM gets the full SKILL.md as context. This mirrors how `@file:` tokens are stripped from the message but replaced with file content context.

**Undecided alternative**: Leave `#skill-name` visible in the message so the user can see what skill was active. This would require a UI rendering change (e.g., styled chips). Out of scope for now; revisit if users find it confusing.

### 7. Conversation-Level Skill Tracking (Persistence)

**Decision**: Maintain a `Map<convId, { name: string, content: string }[]>` as a shared module accessible by both `chat-service` and `agent-service`. The map stores resolved skill names and their full SKILL.md content.

**Rationale**: Skills are session-level, not one-shot. Once `#frontend-design` is used in a conversation, all subsequent messages (even without `#`) should automatically benefit from the skill. The agent loop rebuilds the message context from scratch on every turn, so skills must be re-injected each time. The tracking map avoids re-parsing and re-reading files.

**Tracking flow**:
```
sendChatMessage():
  parseSkillReferences(content) → { skillNames, cleanContent }
  for each name not already tracked:
    resolveSkill(projectPath, name) → content
    skillTracker.add(convId, name, content)     // track new skills
  // strip #token from user message, send as cleanContent
  runAgentLoop({ convId, ... })

runAgentLoop():
  skills = skillTracker.get(convId)              // always read current set
  for each skill in reverse:
    messages.unshift({ role: 'system', content })
```

**Deduplication**: `add()` is idempotent — re-specifying `#frontend-design` in a later message does not re-inject the same content twice. New skills are added to the existing set.

**Conversation lifecycle**: The tracking map entry is cleared when the conversation is deleted or the app restarts (it's in-memory only).

## Risks / Trade-offs

- **[Risk] Manual YAML parsing fails on unusual frontmatter syntax** → SKILL.md format is under our control; the existing 5 skills all use simple key-value pairs. If parsing fails, the file still gets injected (we just don't show description in autocomplete).

- **[Risk] Multiple skills + commands could bloat context** → Each SKILL.md is 50–300 lines (~2K–12K tokens). Two skills + a command could consume significant context. Mitigation: this is inherent to large skill files; users should be aware. Future work could add token budget warnings.

- **[Risk] Skill file changes during agent loop are invisible** → The file is read once at send time; if the user edits it mid-conversation, the change won't take effect until the next message. Acceptable for v1.

- **[Trade-off] No frontmatter YAML library** → Slightly less robust but keeps dependencies lean. Easy to swap later if needed.
