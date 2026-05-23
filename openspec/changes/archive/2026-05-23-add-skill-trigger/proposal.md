## Why

Skill files exist in `.agents/skills/<name>/SKILL.md` but are not surfaced in the chat UI. Users cannot discover, select, or apply skills from the input box — the skill content has no path into the agent loop. The `@` (file reference) and `/` (command) triggers are already established patterns in `InputBox.vue`; adding a `#` trigger for skills completes the triad and makes skills a first-class feature.

## What Changes

- New `#` trigger in the chat input that autocompletes skill names, mirroring the existing `@` and `/` patterns
- New `skill-service.ts` that scans `.agents/skills/` directories, parses SKILL.md YAML frontmatter for name and description, and resolves skill content
- New IPC channel `skill:search` for frontend-to-backend skill discovery
- `chat-service.ts` extended to parse `#skill` tokens from user messages and resolve skill content
- `agent-service.ts` extended to accept multiple skill contents via `skillContents[]` on `AgentRunOptions`, injecting each as a system message (unshift order: skills first, then commands, then base system prompt)
- `InputBox.vue` extended with a third autocomplete dropdown for skills, displaying name + description from frontmatter

## Capabilities

### New Capabilities

- `skill-system`: Skill discovery, search, and resolution from `.agents/skills/<name>/SKILL.md`. Includes YAML frontmatter parsing, `#`-trigger autocomplete, and multi-skill context injection into the agent loop.

### Modified Capabilities

- `agent-chat`: The `#` trigger extends the existing `@` and `/` input patterns. The `AgentRunOptions` interface gains `skillContents`. The context-building logic in `runAgentLoop` now supports skill injection alongside `customPrompt`.

## Impact

- **New file**: `electron/services/skill-service.ts`
- **Modified files**: `shared/types.ts` (IPC channel), `electron/preload.ts` (API), `electron/ipc/register.ts` (handler), `electron/services/chat-service.ts` (parse + resolve), `electron/services/agent-service.ts` (AgentRunOptions + injection), `src/components/chat/InputBox.vue` (UI trigger + dropdown)
- **No breaking changes**: existing `@` and `/` behavior is unchanged; `customPrompt` field remains backward-compatible
- **Dependencies**: YAML frontmatter parsing. Need to check if a YAML parser exists or add `yaml` (or parse manually for the simple frontmatter format)
