## Why

The chat window is the primary workspace for the coding agent, but the current UI reads like an early prototype: message hierarchy is flat, tool execution states are hard to scan, and some status/icon strings can render as noisy encoded text. Improving the chat experience makes agent work easier to follow, safer to review, and more comfortable for repeated use.

## What Changes

- Improve message presentation with clearer role identity, timestamps, visual grouping, and richer markdown readability.
- Improve tool call display with explicit execution state, stable status indicators, argument previews, and readable result/error sections.
- Improve streaming response feedback with a dedicated in-progress assistant panel, waiting animation, and stable running/done/error labels.
- Improve the bottom input composer with a fixed multi-line writing area, focus state, readiness/status text, character count, and a more structured file autocomplete dropdown.
- Improve trust mode visibility by replacing ambiguous icon-only rendering with an explicit `Trust On` / `Trust Off` state control.
- Remove fragile HTML entity and mojibake-prone status/icon strings from the chat surface.

## Capabilities

### New Capabilities

- `chat-experience`: Covers the renderer-side user experience for chat messages, streaming state, tool call summaries, input composition, file autocomplete, and visible trust-mode state.

### Modified Capabilities

None.

## Impact

- Affected renderer components:
  - `src/components/chat/MessageBubble.vue`
  - `src/components/chat/MessageList.vue`
  - `src/components/chat/InputBox.vue`
  - `src/components/chat/ChatWindow.vue`
  - `src/components/chat/ToolCallCard.vue`
- No IPC contract changes.
- No database, agent engine, tool execution, or API client changes.
- No new runtime dependencies.
