## ADDED Requirements

### Requirement: #Skill trigger autocomplete
The system SHALL support typing `#` in the message input to trigger skill autocomplete. A dropdown SHALL appear listing available skills with their names and descriptions, filtered by text after the `#`.

#### Scenario: # triggers skill search
- **WHEN** user types `#front` in the input box
- **THEN** a dropdown SHALL appear showing skills matching "front" with their names and descriptions; selecting one inserts `#skill-name `

#### Scenario: # with no matching text shows all skills
- **WHEN** user types `#` followed by no further characters
- **THEN** a dropdown SHALL appear listing all available skills

#### Scenario: # in middle of text does not trigger
- **WHEN** user types `help #front` with cursor after "front"
- **THEN** skill autocomplete SHALL only trigger based on text after the last `#` before the cursor

#### Scenario: Multiple triggers mutually exclusive
- **WHEN** user types `#` while a `@` dropdown is visible, or vice versa
- **THEN** only the most recent trigger's dropdown SHALL be displayed

### Requirement: #Skill token parsing from user message
The system SHALL parse `#skill-name` tokens from user messages before sending to the agent. Each matched token SHALL be resolved to its SKILL.md content via the skill service. The tokens SHALL be removed from the user-visible message content.

#### Scenario: Single skill parsed
- **WHEN** user sends "#frontend-design 创建登录页面"
- **THEN** the skill content for `frontend-design` SHALL be resolved, and the clean user message SHALL be "创建登录页面"

#### Scenario: Multiple skills parsed
- **WHEN** user sends "#frontend-design #openspec-explore 设计方案"
- **THEN** both skill contents SHALL be resolved in order, and the clean user message SHALL be "设计方案"

#### Scenario: Nonexistent skill silently ignored
- **WHEN** user sends "#nonexistent-skill 帮我做某事" and the skill does not exist
- **THEN** the `#nonexistent-skill` token SHALL be removed from the message, no skill content SHALL be resolved, and the token SHALL be silently dropped

#### Scenario: Skills coexist with /commands
- **WHEN** user sends "#openspec-explore /config"
- **THEN** the skill SHALL be resolved and injected, and the command SHALL be resolved independently

### Requirement: Skill context persists across messages
The system SHALL track active skills in a per-conversation map. When a skill is first activated via `#skill-name`, it SHALL be added to the conversation's tracked set. On every subsequent message in that conversation, all tracked skills SHALL be automatically injected into the agent context without needing the `#` token.

#### Scenario: First skill activation
- **WHEN** user sends "#frontend-design 创建登录页" (first skill activation in this conversation)
- **THEN** the skill SHALL be tracked and injected; user-visible message SHALL be "创建登录页"

#### Scenario: Subsequent message inherits skill
- **WHEN** user sends "把按钮改成蓝色" after previously activating `#frontend-design`
- **THEN** `frontend-design` SKILL.md content SHALL be automatically injected into agent context

#### Scenario: Adding a second skill
- **WHEN** user sends "#openspec-explore 想想架构" in a conversation that already has `#frontend-design` tracked
- **THEN** both `frontend-design` and `openspec-explore` SHALL be injected into agent context for this and subsequent messages

#### Scenario: Duplicate skill token does not duplicate injection
- **WHEN** user sends "#frontend-design 再做一下" in a conversation that already tracks `frontend-design`
- **THEN** the skill SHALL NOT be injected twice; the tracking set SHALL remain unchanged

## MODIFIED Requirements

### Requirement: Custom prompt in agent context
The `AgentRunOptions` SHALL support an optional `customPrompt` field for command-injected prompts. Skill prompt injection SHALL be handled through a shared per-conversation tracking map (not through `AgentRunOptions`), read by `runAgentLoop` each time. When tracked skills exist, their contents SHALL be injected as system messages before `customPrompt` and before the regular system prompt. When only `customPrompt` is set, existing command behavior SHALL be unchanged.

#### Scenario: Custom prompt injected into agent context (unchanged)
- **WHEN** a custom command provides a COMMAND.md prompt
- **THEN** the agent's message array SHALL begin with `{ role: "system", content: "<COMMAND.md>" }` followed by the regular system prompt

#### Scenario: Tracked skills injected before custom prompt
- **WHEN** a conversation has tracked skill "frontend-design" and the current message triggers a `/` command
- **THEN** the message order SHALL be skill content, command content, base system prompt
