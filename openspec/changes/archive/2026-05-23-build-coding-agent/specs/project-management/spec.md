## ADDED Requirements

### Requirement: Add project by selecting a folder
The system SHALL allow users to add a project by selecting a local directory via native folder picker dialog. The project name SHALL default to the selected folder's name.

#### Scenario: Add project successfully
- **WHEN** user clicks "Add Project" and selects `C:\Projects\my-app`
- **THEN** a project named "my-app" with path `C:\Projects\my-app` is added to the project list

#### Scenario: Add project with duplicate path
- **WHEN** user selects a folder path that is already registered as a project
- **THEN** the system SHALL show an error message and not create a duplicate project

### Requirement: List all projects
The system SHALL display all registered projects in the sidebar, ordered by most recently active.

#### Scenario: Projects shown in sidebar
- **WHEN** the application starts
- **THEN** all saved projects SHALL appear in the left sidebar sorted by last activity time

### Requirement: Remove project
The system SHALL allow users to remove a project from the list. Removing a project SHALL delete all associated conversations and their messages from the database.

#### Scenario: Remove project with confirmation
- **WHEN** user right-clicks a project and selects "Remove"
- **THEN** a confirmation dialog SHALL appear; upon confirmation, the project and all its conversations SHALL be permanently deleted
