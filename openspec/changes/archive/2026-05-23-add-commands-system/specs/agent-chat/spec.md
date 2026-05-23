## ADDED Requirements

### Requirement: Command prefix interception
The system SHALL detect `/`-prefixed messages and SHALL resolve them against the command registry before sending to the AI agent. Built-in commands SHALL execute locally; custom commands SHALL augment the context with a system instruction; unrecognized commands SHALL be sent to the AI as-is.

#### Scenario: Built-in command intercepted and executed locally
- **WHEN** user sends `/config`
- **THEN** the message SHALL NOT be sent to the AI; the command SHALL execute locally and return a result message

#### Scenario: Custom command augments agent context
- **WHEN** user sends `/git-commit`
- **THEN** the agent loop SHALL start with the COMMAND.md content injected as an additional system message

### Requirement: Custom prompt in agent context
The `AgentRunOptions` SHALL support an optional `customPrompt` field. When set, the prompt text SHALL be inserted as the first system message before the regular system prompt and project context.

#### Scenario: Custom prompt injected into agent context
- **WHEN** a custom command provides a COMMAND.md prompt
- **THEN** the agent's message array SHALL begin with `{ role: "system", content: "<COMMAND.md>" }` followed by the regular system prompt

### Requirement: Configurable max turns
The maximum agent loop turns SHALL be read from `config.maxTurns` in `.agents/config.toml`, defaulting to 50 when not configured.

#### Scenario: max_turns from config
- **WHEN** `.agents/config.toml` contains `max_turns = 30`
- **THEN** the agent loop SHALL run at most 30 turns

#### Scenario: max_turns default
- **WHEN** `.agents/config.toml` does not configure `max_turns`
- **THEN** the agent loop SHALL use the default value of 50
