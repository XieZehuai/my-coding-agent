## MODIFIED Requirements

### Requirement: Agent loop uses pre-loaded config

The `AgentLoop` class SHALL receive `AppConfig` via its constructor rather than reading it from disk via `readConfig(projectPath)` on each `start()` call. Config loading SHALL happen once in `chat-service.sendChatMessage` and be immutable for the duration of the agent loop.

#### Scenario: Config loaded once per conversation

- **WHEN** `chat-service.sendChatMessage` constructs an agent loop
- **THEN** `readConfig(projectPath)` SHALL be called exactly once, its result passed to the `AgentLoop` constructor, and used for the entire loop duration
