## ADDED Requirements

### Requirement: ToolExecutor encapsulates tool execution pipeline

The system SHALL provide a `ToolExecutor` class that handles the complete lifecycle of executing a single tool call: argument parsing, permission checking, ask routing (via `ConversationRuntime`), tool invocation (via `registry.executeTool`), result persistence (`saveToolMessage`), and IPC event emission (`EVENT_TOOL_START`, `EVENT_TOOL_END`, `EVENT_TOOL_ERROR`, `EVENT_ASK`).

#### Scenario: ToolExecutor executes a permitted tool

- **WHEN** `ToolExecutor.execute(toolCall)` is called with permission level "always"
- **THEN** the executor SHALL parse arguments, emit `EVENT_TOOL_START`, call `executeTool`, emit `EVENT_TOOL_END`, persist the result via `saveToolMessage`, and push the tool message to the context

#### Scenario: ToolExecutor handles denied tool

- **WHEN** `ToolExecutor.execute(toolCall)` encounters a tool with permission level "deny"
- **THEN** the executor SHALL emit `EVENT_TOOL_ERROR` with "Permission denied", persist the error message via `saveToolMessage(..., true)`, and push the error tool message

#### Scenario: ToolExecutor routes ask through runtime

- **WHEN** `ToolExecutor.execute(toolCall)` encounters a tool with permission level "ask"
- **THEN** the executor SHALL emit `EVENT_ASK` with ask context, register the resolution callback via `runtime.registerAsk(askId, ...)`, and signal the caller that the tool is awaiting user confirmation

#### Scenario: ToolExecutor handles argument parse failure

- **WHEN** `ToolExecutor.execute(toolCall)` receives a tool call with invalid JSON arguments
- **THEN** the executor SHALL emit `EVENT_TOOL_ERROR` with the parse error, record the failure in the tool log, persist via `saveToolMessage(..., true)`, and push the error tool message
