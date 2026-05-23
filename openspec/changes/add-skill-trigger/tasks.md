## 1. IPC & Type Plumbing

- [x] 1.1 Add `SKILL_SEARCH: 'skill:search'` to `IPC` constants in `shared/types.ts`
- [x] 1.2 Add `searchSkills` method to `window.api` in `electron/preload.ts`
- [x] 1.3 Register `skill:search` IPC handler in `electron/ipc/register.ts`

## 2. Skill Service (Backend)

- [x] 2.1 Create `electron/services/skill-service.ts` with `searchSkills(projectPath, query)` that scans `.agents/skills/*/SKILL.md` and parses YAML frontmatter for `name` and `description`
- [x] 2.2 Implement manual YAML frontmatter parser (extract `name` and `description` from `---` delimited block)
- [x] 2.3 Implement `resolveSkill(projectPath, name)` that returns full SKILL.md content or null if not found
- [x] 2.4 Implement `parseSkillReferences(content)` that extracts `#skill-name` tokens and returns `{ skillNames[], cleanContent }`

## 3. Skill Tracking Map (Shared Module)

- [x] 3.1 Create `electron/services/skill-tracker.ts` with a `Map<convId, { name, content }[]>` for per-conversation skill tracking
- [x] 3.2 Implement `skillTracker.add(convId, name, content)` — idempotent, skips duplicate names
- [x] 3.3 Implement `skillTracker.get(convId)` — returns tracked skills array in activation order
- [x] 3.4 Implement `skillTracker.clear(convId)` — called on conversation deletion

## 4. Chat Service Integration

- [x] 4.1 Call `parseSkillReferences` in `sendChatMessage()` in `electron/services/chat-service.ts` before starting agent loop
- [x] 4.2 For each parsed skill name not already tracked, call `resolveSkill` and `skillTracker.add`; skip duplicates silently
- [x] 4.3 Strip `#skill-name` tokens from user message, send only `cleanContent` to agent

## 5. Agent Loop Integration

- [x] 5.1 In `runAgentLoop()`, read `skillTracker.get(convId)` and inject all tracked skill contents as system messages before `customPrompt`
- [x] 5.2 Ensure skill injection order matches activation order (reverse when unshifting)

## 6. Frontend — InputBox.vue

- [x] 6.1 Add reactive state for skill autocomplete: `showSkillSearch`, `skillResults`, `skillSelectedIndex`
- [x] 6.2 Add `#` regex trigger in `handleInput()` (alongside existing `@` and `/`), debounced IPC call to `window.api.searchSkills`
- [x] 6.3 Add `#` handling in `handleKeydown()` for arrow navigation, Enter/Tab selection, Escape to close
- [x] 6.4 Add `#` handling in `selectDropdownItem()` to replace `#partial` with `#skill-name ` in input text
- [x] 6.5 Add skill autocomplete dropdown template (between existing file and command dropdowns), displaying skill name and description
- [x] 6.6 Add skill dropdown CSS styling (reuse existing `.autocomplete-dropdown` and `.dropdown-item` styles)
- [x] 6.7 Update placeholder text to `"Type @ for files, / for commands, # for skills..."`
- [x] 6.8 Update `inputStatus` computed to reflect skill search state

## 7. Verification

- [ ] 7.1 Test: `#` triggers dropdown with correct skills listed (name + description)
- [ ] 7.2 Test: selecting a skill inserts `#skill-name ` and closes dropdown
- [ ] 7.3 Test: `#skill-name message` sends correctly, SKILL.md content reaches agent context
- [ ] 7.4 Test: multiple skills (`#skill1 #skill2`) both injected in correct order
- [ ] 7.5 Test: `#nonexistent` silently dropped from message, no error
- [ ] 7.6 Test: `#skill /cmd text` works with both skill and command injected
- [ ] 7.7 Test: skill persists — after `#skill msg1`, then `msg2` (no `#`), skill still injected for msg2
- [ ] 7.8 Test: duplicate `#skill` in same conversation does NOT double-inject
- [ ] 7.9 Test: `@` and `/` triggers still work correctly (no regression)
- [x] 7.10 Run `npm run typecheck` and `npm run lint` to verify no type or lint errors
