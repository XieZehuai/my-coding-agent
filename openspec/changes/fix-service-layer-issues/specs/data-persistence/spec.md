## MODIFIED Requirements

### Requirement: Tool messages update conversation timestamp

The `saveToolMessage` function SHALL call `touchConversation(convId)` after inserting the tool message row, consistent with `saveUserMessage` and `saveAssistantMessage`, so that conversation list ordering reflects the most recent tool execution.

#### Scenario: Tool message touches conversation

- **WHEN** a tool message is saved via `saveToolMessage(convId, content, toolCallId, isError)`
- **THEN** the conversation's `updated_at` column SHALL be updated to the current timestamp
