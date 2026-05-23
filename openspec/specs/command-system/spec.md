## ADDED Requirements

### Requirement: Built-in /config command
The system SHALL provide a built-in `/config` command that creates or updates the `.agents/config.toml` file in the current project. If the file does not exist, it SHALL be created with all default configuration values. If the file exists, the system SHALL append only the missing configuration keys.

#### Scenario: Create config.toml from scratch
- **WHEN** user types `/config` in a project without `.agents/config.toml`
- **THEN** `.agents/config.toml` SHALL be created with default `[api]`, `[permissions]`, and `max_turns` values

#### Scenario: Update existing config.toml
- **WHEN** user types `/config` in a project where `config.toml` exists but is missing `max_turns`
- **THEN** the missing key SHALL be appended to the end of the file, and existing keys SHALL remain unchanged

#### Scenario: Config is already complete
- **WHEN** user types `/config` and all known configuration keys are already present
- **THEN** the system SHALL report that no update is needed

### Requirement: Custom commands directory
The system SHALL recognize user-defined commands stored as `.agents/commands/<name>/COMMAND.md` files. Each directory name SHALL become a slash-command name.

#### Scenario: Invoke custom command
- **WHEN** user types `/git-commit` and `.agents/commands/git-commit/COMMAND.md` exists
- **THEN** the content of `COMMAND.md` SHALL be injected as a system message into the AI context, and the agent loop SHALL start

#### Scenario: Custom command with additional text
- **WHEN** user types `/git-commit 用中文写 commit message` and the command exists
- **THEN** the COMMAND.md content SHALL be injected as a system message, and "用中文写 commit message" SHALL be sent as the user message

#### Scenario: Custom command not found
- **WHEN** user types `/nonexistent` and no matching built-in or custom command exists
- **THEN** the raw text SHALL be sent to the AI as a normal message

### Requirement: Command interception in chat flow
The system SHALL intercept `/`-prefixed messages before starting the agent loop. Built-in commands SHALL execute locally and return results as assistant messages. Custom commands SHALL start the agent loop with additional system prompt context.

#### Scenario: Built-in command returns result without agent loop
- **WHEN** user types `/config`
- **THEN** the command SHALL execute locally, the result SHALL be saved as an assistant message, and no API call SHALL be made

#### Scenario: Custom command starts agent loop
- **WHEN** user types `/git-commit`
- **THEN** the agent loop SHALL start with the COMMAND.md content as a system message

### Requirement: Command autocomplete
The system SHALL provide autocomplete for commands when the user types `/` in the chat input. The dropdown SHALL include both built-in commands and custom commands found in `.agents/commands/`.

#### Scenario: Show command dropdown
- **WHEN** user types `/` in the chat input
- **THEN** a dropdown SHALL appear listing available built-in and custom commands

#### Scenario: Select command from dropdown
- **WHEN** user selects a command from the autocomplete dropdown
- **THEN** the full command name with `/` prefix SHALL be inserted into the input

### Requirement: Command search API
The system SHALL provide an IPC endpoint `command:search` that returns matching command names for a given query string.

#### Scenario: Search commands by prefix
- **WHEN** renderer calls `command:search(projectPath, "git")`
- **THEN** the system SHALL return `["/git-commit"]` if that custom command exists
