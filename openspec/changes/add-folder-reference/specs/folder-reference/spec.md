## ADDED Requirements

### Requirement: Folder reference via @ command
The system SHALL support referencing directories via the `@` command. When a user selects a directory from the `@` autocomplete dropdown, the system SHALL insert a `@file:<path>` reference that will be resolved to a directory tree listing as conversation context.

#### Scenario: Select a folder from autocomplete dropdown
- **WHEN** the user types `@` followed by text matching a directory name in the project
- **AND** the autocomplete dropdown shows the matching directory entry (displayed with a trailing `/` icon)
- **AND** the user selects the directory (by click, Enter, or Tab)
- **THEN** the system SHALL insert `@file:<dir-path>` (without trailing `/`) into the input text

#### Scenario: Select a deeply nested folder
- **WHEN** the user types `@` followed by text matching a nested directory path (e.g., `@src/comp`)
- **AND** the system displays matching directories in the dropdown
- **AND** the user selects the directory
- **THEN** the system SHALL insert `@file:<full-relative-path>` into the input text

### Requirement: Folder reference resolution
The system SHALL resolve `@file:` references that point to directories by generating a tree-style directory listing. The listing SHALL be included in the conversation context alongside individually referenced files.

#### Scenario: Resolve a folder reference to a directory listing
- **WHEN** `parseFileReferences` encounters a `@file:<path>` whose resolved full path is a directory
- **THEN** the system SHALL generate a tree listing of the directory contents (up to max depth 3, max 100 entries)
- **AND** the system SHALL store the listing in the `fileContents` map keyed by the reference path

#### Scenario: Folder reference resolves alongside file references
- **WHEN** user input contains both `@file:file1.ts` and `@file:src/components/` (a directory)
- **THEN** the system SHALL include `file1.ts` content as a single file entry
- **AND** the system SHALL include a directory tree listing for `src/components`

#### Scenario: Referenced folder does not exist
- **WHEN** `parseFileReferences` encounters a `@file:<path>` that does not exist on the filesystem
- **THEN** the system SHALL silently skip the reference (no error, no context injection)

#### Scenario: Referenced folder is empty
- **WHEN** `parseFileReferences` encounters a `@file:<path>` pointing to a valid directory that contains no entries
- **THEN** the system SHALL add a listing entry showing the directory path with no children

### Requirement: Directory listing format
The system SHALL generate directory listings in a readable tree format with directory depth limits and entry count caps.

#### Scenario: Directory listing uses tree format
- **WHEN** a directory listing is generated for a referenced folder
- **THEN** the listing SHALL start with the relative directory path followed by `/`
- **AND** entries SHALL be displayed with `├── ` and `└── ` tree connectors
- **AND** directories SHALL have a trailing `/` indicator

#### Scenario: Depth limit enforcement in listing
- **WHEN** generating a directory listing
- **THEN** the system SHALL stop descending at a maximum depth of 3 levels from the folder root

#### Scenario: Entry count limit enforcement in listing
- **WHEN** generating a directory listing
- **THEN** the system SHALL stop listing additional entries after reaching a maximum of 100 entries

#### Scenario: Exclusion of node_modules and hidden directories
- **WHEN** generating a directory listing
- **THEN** the system SHALL skip `node_modules` directory and its contents entirely
- **AND** the system SHALL skip hidden directories (names starting with `.`) except `.agents`

### Requirement: Context representation for directories
The system SHALL present directory listings to the AI model with a distinct label to differentiate them from file contents.

#### Scenario: Directory listing labeled distinctly
- **WHEN** a directory listing is injected into the conversation context
- **THEN** the listing SHALL be presented as `### Directory: <path>\n\`\`\`\n<tree-listing>\n\`\`\``

#### Scenario: File contents use standard label
- **WHEN** individual file contents are injected into the conversation context
- **THEN** they SHALL continue to be presented as `### File: <path>\n\`\`\`\n<content>\n\`\`\``

### Requirement: Edge cases
The system SHALL handle edge cases gracefully when dealing with folder references.

#### Scenario: Referenced path is a symlink to a directory
- **WHEN** a `@file:<path>` resolves to a symlink pointing to a directory
- **THEN** the system SHALL follow the symlink and list the target directory contents
- **AND** the system SHALL respect the same depth and count limits

#### Scenario: Unreadable subdirectory in listing
- **WHEN** a subdirectory within the referenced folder cannot be read
- **THEN** the system SHALL show `[unreadable]` for that entry and continue listing siblings
