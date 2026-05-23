## ADDED Requirements

### Requirement: Read permission configuration
The system SHALL read the permission configuration from `.agents/config.toml` in the project root. Supported permission keys are `read`, `write`, and `execute`, each with values `always`, `ask`, or `deny`.

#### Scenario: Config file exists with valid permissions
- **WHEN** a project has `.agents/config.toml` with `[permissions] write = "ask"`
- **THEN** the system SHALL load `write` permission as `ask`

#### Scenario: Config file missing
- **WHEN** a project does not have `.agents/config.toml`
- **THEN** the system SHALL use default permissions: read=always, write=ask, execute=ask

### Requirement: Resolve operation permission
The system SHALL check the configured permission before executing any tool. When permission is `always`, the tool SHALL execute immediately. When `ask`, the system SHALL prompt the user for confirmation. When `deny`, the system SHALL reject the operation and notify the AI.

#### Scenario: Always permission auto-executes
- **WHEN** read permission is `always` and the agent invokes `read_file`
- **THEN** the file SHALL be read immediately without prompting the user

#### Scenario: Ask permission prompts user
- **WHEN** write permission is `ask` and the agent invokes `write_file`
- **THEN** a confirmation modal SHALL appear showing the file path and a preview of changes

#### Scenario: Deny permission blocks operation
- **WHEN** execute permission is `deny` and the agent invokes `run_command`
- **THEN** the operation SHALL be rejected and the agent SHALL be informed that the operation was denied

### Requirement: Trust mode toggle
The system SHALL provide a per-conversation trust mode toggle in the chat window UI. When trust mode is enabled, ALL operations SHALL execute immediately as if permission were `always`, regardless of the config file settings. A visual indicator SHALL show when trust mode is active.

#### Scenario: Enable trust mode
- **WHEN** user clicks the trust mode toggle in a conversation
- **THEN** a visual indicator (e.g., highlighted header) SHALL appear, and subsequent tool operations SHALL execute without confirmation

#### Scenario: Disable trust mode
- **WHEN** user disables trust mode
- **THEN** permission resolution SHALL return to the config file baseline

#### Scenario: Trust mode is per-conversation
- **WHEN** user switches to a different conversation
- **THEN** trust mode SHALL NOT carry over; each conversation has its own trust mode state

### Requirement: Permission confirmation modal
When an operation requires user confirmation, the system SHALL display a modal showing the tool name, target file path or command, and a preview of the operation's effect.

#### Scenario: Confirm file write
- **WHEN** the agent wants to write `src/utils.ts` and permission is `ask`
- **THEN** a modal SHALL appear showing the file path; user can click "Allow" to proceed or "Deny" to reject

#### Scenario: Deny permission
- **WHEN** user clicks "Deny" on the confirmation modal
- **THEN** the operation SHALL be rejected and the agent SHALL receive a "permission denied" tool result
