## ADDED Requirements

### Requirement: StatusReporter centralizes IPC emission

The system SHALL provide a `StatusReporter` class that wraps `emitToRenderer` for all agent-related IPC events with throttled status emission at 500ms intervals.

#### Scenario: StatusReporter throttles status emissions

- **WHEN** `reportStatus(snapshot)` is called multiple times within 500ms
- **THEN** only the first call SHALL emit `EVENT_STATUS`; subsequent calls in the window SHALL be suppressed

#### Scenario: StatusReporter passes through non-throttled events

- **WHEN** `reportEvent(convId, channel, data)` is called for `EVENT_TOKEN` or `EVENT_REASONING`
- **THEN** the event SHALL be emitted immediately without throttling
