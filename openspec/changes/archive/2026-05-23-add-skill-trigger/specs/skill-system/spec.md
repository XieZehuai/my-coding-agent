## ADDED Requirements

### Requirement: Skill directory discovery
The system SHALL scan `.agents/skills/` in the project root to discover available skills. Each subdirectory with a valid `SKILL.md` file SHALL be recognized as a skill. The directory name SHALL be the skill identifier.

#### Scenario: Discover skills in project
- **WHEN** a project has `.agents/skills/frontend-design/SKILL.md` and `.agents/skills/openspec-explore/SKILL.md`
- **THEN** the system SHALL recognize `frontend-design` and `openspec-explore` as available skills

#### Scenario: Skip directories without SKILL.md
- **WHEN** `.agents/skills/incomplete/` exists but has no `SKILL.md` file
- **THEN** the system SHALL NOT list `incomplete` as an available skill

#### Scenario: No skills directory
- **WHEN** `.agents/skills/` does not exist
- **THEN** the system SHALL return an empty skill list without error

### Requirement: Skill YAML frontmatter parsing
The system SHALL parse the YAML frontmatter block (delimited by `---`) at the start of each `SKILL.md` to extract the `name` and `description` fields. These fields SHALL be used for autocomplete display.

#### Scenario: Parse frontmatter with name and description
- **WHEN** SKILL.md contains `---\nname: frontend-design\ndescription: Create distinctive frontend interfaces\n---`
- **THEN** the system SHALL extract `name: "frontend-design"` and `description: "Create distinctive frontend interfaces"`

#### Scenario: Skill file without frontmatter
- **WHEN** SKILL.md has no `---` delimited frontmatter block
- **THEN** the system SHALL use the directory name as the skill name and return an empty description

### Requirement: Skill search API
The system SHALL provide an IPC endpoint `skill:search` that accepts a project path and optional query string, and returns matching skill names with their descriptions.

#### Scenario: Search skills by query prefix
- **WHEN** renderer calls `skill:search(projectPath, "open")`
- **THEN** the system SHALL return `[{ name: "openspec-explore", description: "Enter explore mode..." }]` if that skill exists

#### Scenario: Search with empty query returns all
- **WHEN** renderer calls `skill:search(projectPath, "")`
- **THEN** the system SHALL return all discovered skills with their names and descriptions

#### Scenario: Search with no matches
- **WHEN** renderer calls `skill:search(projectPath, "nonexistent")`
- **THEN** the system SHALL return an empty array

### Requirement: Skill content resolution
The system SHALL provide `resolveSkill(projectPath, name)` that reads the full content of `.agents/skills/<name>/SKILL.md` and returns it as a string. The entire file content (including YAML frontmatter) SHALL be returned.

#### Scenario: Resolve existing skill
- **WHEN** `resolveSkill(projectPath, "frontend-design")` is called and `SKILL.md` exists
- **THEN** the system SHALL return the complete file content

#### Scenario: Resolve nonexistent skill
- **WHEN** `resolveSkill(projectPath, "nonexistent")` is called
- **THEN** the system SHALL return null

### Requirement: Multi-skill context injection
The `runAgentLoop` function SHALL read tracked skills for the conversation from a shared tracking map and inject each skill's content as a system message at the front of the message array. Skill messages SHALL appear before the command `customPrompt` and base system prompt. Newest skills SHALL be unshifted first, so the earliest-activated skill appears first in the final message order.

#### Scenario: Single skill injected
- **WHEN** a conversation has one tracked skill "frontend-design"
- **THEN** the message array SHALL begin with `{ role: "system", content: "<frontend-design SKILL.md>" }` before the base system prompt

#### Scenario: Multiple skills injected in activation order
- **WHEN** a conversation has tracked skills "skill-A" then "skill-B" (activated in that order)
- **THEN** the message array SHALL have `skill-A` content first, followed by `skill-B` content, followed by the base system prompt

#### Scenario: Skills and customPrompt coexist
- **WHEN** a conversation has a tracked skill and the current message triggers a `/` command
- **THEN** the message order SHALL be: skill content, command content, base system prompt

### Requirement: Conversation-level skill persistence
The system SHALL maintain a per-conversation skill tracking map that persists within the conversation session (in-memory). When a `#skill-name` token is resolved for the first time in a conversation, the skill SHALL be added to the tracking set. On subsequent messages in the same conversation, tracked skills SHALL be automatically re-injected without requiring the `#` token.

#### Scenario: Skill persists to next message
- **WHEN** user sends "#frontend-design 创建登录页" then sends "把按钮改成蓝色"
- **THEN** the second message SHALL still have `frontend-design` skill content injected into the agent context

#### Scenario: Accumulate multiple skills over time
- **WHEN** user sends "#frontend-design 做UI" then sends "#openspec-explore 想想架构"
- **THEN** both `frontend-design` and `openspec-explore` SHALL be injected into the agent context for the second message and any subsequent messages

#### Scenario: Duplicate skill ignored
- **WHEN** user sends "#frontend-design 做A" then sends "#frontend-design 做B"
- **THEN** the skill SHALL NOT be injected twice; the existing tracking entry SHALL be unchanged

#### Scenario: Tracking cleared on conversation end
- **WHEN** the app restarts or the conversation is deleted
- **THEN** the tracking map entry for that conversation SHALL be cleared
