## Why

The developer diagnostics panel currently sits as a fixed overlay at the bottom of the window, covering the chat input area and the last few messages whenever it's open. This forces users to constantly toggle it on and off to read or type. Moving the panel to the right side and making it visible by default keeps agent state, token usage, and tool logs always glanceable without obstructing the conversation workspace.

## What Changes

- Reposition the developer panel from a bottom-fixed overlay to a right-side panel that sits beside the main chat content in the flex layout.
- Change the panel's default visibility from hidden (`false`) to visible (`true`).
- Convert the panel resize axis from vertical (height) to horizontal (width), allowing users to drag the left edge of the right panel to adjust its width.
- Remove the bottom-fixed toggle button; the panel remains always present as part of the workbench shell.
- Keep the `Ctrl+D` keyboard shortcut to toggle panel visibility for users who prefer to minimize it.
- Preserve all existing panel content: token usage, agent state, and tool log sections.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `panel-resize`: The developer panel's resize behavior changes from vertical (height-based, bottom edge) to horizontal (width-based, left edge). The minimum and maximum constraints change accordingly (min 200px, max 40% viewport width). The panel size key in the layout store remains `devPanelHeight` but is semantically repurposed as the panel width. **BREAKING**: existing saved `layout:devPanelHeight` values in localStorage will be interpreted as width after this change.

## Impact

- Affected renderer components:
  - `src/components/dev/DevPanel.vue` — reposition from fixed overlay to flex child, change resize axis, default visibility
  - `src/components/layout/AppLayout.vue` — integrate right panel into flex layout; remove separate DevPanel overlay slot
  - `src/stores/layout.ts` — update defaults and constraints for the repurposed size value
- May affect:
  - `src/components/chat/ChatWindow.vue` — flex layout adjusts naturally as DevPanel moves out of its overlay position
- No IPC contract changes. No new runtime dependencies.
- LocalStorage migration: the existing `layout:devPanelHeight` key will be reused for the panel width; no migration needed beyond the constraint change.
