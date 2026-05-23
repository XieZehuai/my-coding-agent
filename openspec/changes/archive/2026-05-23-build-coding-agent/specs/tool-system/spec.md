## ADDED Requirements

### Requirement: File read tool
The system SHALL provide a `read_file` tool that reads content from a specified file path relative to the project root. It SHALL support optional `start_line` and `end_line` parameters for partial reads.

#### Scenario: Read entire file
- **WHEN** the agent invokes `read_file("src/utils.ts")`
- **THEN** the full content of `src/utils.ts` SHALL be returned

#### Scenario: Read partial file
- **WHEN** the agent invokes `read_file("src/utils.ts", start_line=10, end_line=30)`
- **THEN** lines 10 through 30 of the file SHALL be returned

### Requirement: File write tool
The system SHALL provide a `write_file` tool that writes content to a specified file path. If the file exists, the original content SHALL be backed up for undo before overwriting.

#### Scenario: Write new file
- **WHEN** the agent invokes `write_file("src/new.ts", content)` and the file does not exist
- **THEN** the file SHALL be created with the given content, and the new file SHALL be tracked for undo

#### Scenario: Overwrite existing file
- **WHEN** the agent invokes `write_file("src/utils.ts", newContent)` and the file exists
- **THEN** the original content SHALL be backed up to `.agents/backups/{convId}/`, then the file SHALL be overwritten

### Requirement: Directory list tool
The system SHALL provide a `list_directory` tool that returns the directory tree of a specified path.

#### Scenario: List project root
- **WHEN** the agent invokes `list_directory("src")`
- **THEN** the names and types (file/directory) of all entries in `src/` SHALL be returned

### Requirement: Glob search tool
The system SHALL provide a `glob_search` tool that finds files matching a specified glob pattern.

#### Scenario: Find all TypeScript files
- **WHEN** the agent invokes `glob_search("src/**/*.ts")`
- **THEN** a list of matching file paths SHALL be returned

### Requirement: Grep search tool
The system SHALL provide a `grep_search` tool that searches file contents for a regex pattern and returns matching lines with file paths and line numbers.

#### Scenario: Search for function definition
- **WHEN** the agent invokes `grep_search("function\s+fetchData")`
- **THEN** all matching lines with file paths and line numbers SHALL be returned

### Requirement: Command execution tool
The system SHALL provide a `run_command` tool that executes a shell command via PowerShell. Commands SHALL have a configurable timeout with a default of 120 seconds. The stdout and stderr SHALL be captured and returned.

#### Scenario: Execute npm install
- **WHEN** the agent invokes `run_command("npm install")`
- **THEN** the command SHALL run in PowerShell, and the combined stdout/stderr SHALL be returned

#### Scenario: Command timeout
- **WHEN** a command exceeds the timeout limit (default 120s)
- **THEN** the process SHALL be terminated and a timeout error SHALL be returned

### Requirement: Git status tool
The system SHALL provide a `git_status` tool that returns the current git working tree status of the project.

#### Scenario: Check git status
- **WHEN** the agent invokes `git_status()`
- **THEN** the output of `git status --short` SHALL be returned

### Requirement: Git diff tool
The system SHALL provide a `git_diff` tool that returns the current working tree diff.

#### Scenario: Show working tree changes
- **WHEN** the agent invokes `git_diff()`
- **THEN** the output of `git diff` SHALL be returned
