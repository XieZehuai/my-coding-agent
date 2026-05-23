## Why

All major panels in the workbench (sidebar, chat input box, developer diagnostics drawer) currently have fixed sizes that cannot be adjusted by the user. This limits workspace flexibility — different workflows benefit from different proportions (e.g., wider sidebar for browsing conversations, taller input for composing long prompts, larger dev panel for inspecting agent activity). Users need to be able to drag panel edges to resize them to fit their current task.

## What Changes

- Add draggable resize handles between the sidebar and main content area, allowing users to adjust sidebar width dynamically.
- Add a vertical resize handle above the chat input box, allowing users to expand or shrink the input area.
- Add a vertical resize handle on the top edge of the developer diagnostics panel, allowing users to control its visible height.
- Persist panel size preferences so sizes are restored across app restarts.
- Enforce minimum and maximum size constraints for each resizable panel to prevent unusable layouts.

## Capabilities

### New Capabilities

- `panel-resize`: Covers all resize handle interactions across the workbench: sidebar horizontal resize, input box vertical resize, and dev panel vertical resize. Includes size constraints (min/max) and size persistence.

### Modified Capabilities

None.

## Impact

- Affected renderer components:
  - `src/components/layout/AppLayout.vue` — replace fixed sidebar width with reactive width + resize handle
  - `src/components/chat/ChatWindow.vue` — add resize handle between message list and input box
  - `src/components/chat/InputBox.vue` — remove hardcoded max-height, become resizable container
  - `src/components/dev/DevPanel.vue` — replace fixed `left` offset and `max-height` with reactive values + resize handle
- May add:
  - `src/composables/useResizable.ts` — shared pointer-event drag logic
  - `src/stores/layout.ts` — reactive panel sizes persisted to local config
- No IPC contract changes. No new runtime dependencies.
- No database, agent engine, or tool execution changes.
