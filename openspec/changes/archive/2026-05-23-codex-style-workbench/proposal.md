## Why

The application has the core pieces of a coding agent, but the overall interface still feels like separate panels rather than a cohesive engineering workbench. A Codex-style workbench should make project context, conversation state, agent activity, permissions, and developer diagnostics easy to scan while keeping the chat workflow central.

## What Changes

- Reframe the app shell as a focused workbench with a quieter sidebar, a stronger conversation header, and clearer workspace context.
- Improve project and conversation navigation so the current project, selected conversation, recent activity, and empty states are easier to understand.
- Add a compact agent status surface for state, round/progress, token usage, and active tool activity without requiring the developer panel to be open.
- Make trust/permission posture visible as part of the workbench chrome, with clear states and entry points to permission details.
- Integrate the existing developer panel more cleanly so it behaves like an inspectable diagnostics drawer rather than a floating afterthought.
- Preserve the chat-first workflow and avoid adding a built-in code editor or changing agent behavior.

## Capabilities

### New Capabilities

- `workbench-experience`: Covers the renderer-side application shell, project/conversation navigation, workbench status chrome, permission posture visibility, and developer diagnostics presentation around the chat surface.

### Modified Capabilities

None.

## Impact

- Affected renderer components are expected to include:
  - `src/components/layout/AppLayout.vue`
  - `src/components/sidebar/ProjectList.vue`
  - `src/components/sidebar/ConversationList.vue`
  - `src/components/chat/ChatWindow.vue`
  - `src/components/dev/DevPanel.vue`
  - potentially shared renderer styles in `src/App.vue`
- May add small renderer-only presentational components if useful.
- No IPC contract changes are required for the first pass; existing stores and status events should be reused.
- No database, agent engine, tool execution, or API client changes.
- No new runtime dependencies.
