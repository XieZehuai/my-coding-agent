## MODIFIED Requirements

### Requirement: Trust mode toggle
The system SHALL provide a per-conversation trust mode toggle in the chat window UI. When trust mode is enabled, ALL operations SHALL execute immediately as if permission were `always`, regardless of the config file settings. A visual indicator SHALL show when trust mode is active. The trust mode state SHALL persist across application restarts via the SQLite database.

#### Scenario: Enable trust mode
- **WHEN** user clicks the trust mode toggle in a conversation
- **THEN** a visual indicator (e.g., highlighted toggle) SHALL appear, and subsequent tool operations SHALL execute without confirmation

#### Scenario: Disable trust mode
- **WHEN** user disables trust mode
- **THEN** permission resolution SHALL return to the config file baseline

#### Scenario: Trust mode is per-conversation
- **WHEN** user switches to a different conversation
- **THEN** trust mode SHALL NOT carry over; each conversation has its own trust mode state

#### Scenario: Trust mode persists across restarts
- **WHEN** user enables trust mode on a conversation, closes the app, and reopens it
- **THEN** the same conversation SHALL still have trust mode enabled
