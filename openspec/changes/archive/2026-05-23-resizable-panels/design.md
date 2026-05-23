## Context

The current workbench layout uses hardcoded pixel values for all major panel dimensions: the sidebar is fixed at `280px`, the developer panel is fixed at `left: 280px` with `max-height: 250px`, and the chat input textarea is capped at `max-height: 160px`. Users have no way to adjust these sizes based on their workflow — a user browsing many conversations would benefit from a wider sidebar, while a user inspecting agent logs would want a taller dev panel.

This change adds drag-to-resize handles without introducing new UI frameworks or external dependencies. It builds purely on Vue 3 reactivity, composables, and native pointer events.

## Goals / Non-Goals

**Goals:**
- Allow users to resize the sidebar width by dragging a vertical handle between the sidebar and main content.
- Allow users to resize the chat input area vertically by dragging a horizontal handle above the input box.
- Allow users to resize the developer panel height by dragging its top edge.
- Enforce sensible minimum and maximum size constraints for each panel.
- Persist user size preferences and restore them on app restart.
- Keep resize handles visually subtle — part of the workbench chrome, not standalone decoration.

**Non-Goals:**
- No arbitrary panel floating, docking, or rearranging.
- No multi-window or tab-based layouts.
- No resize animation or transition effects (immediate resizing is preferred for responsiveness).
- No touch/gesture support (desktop Electron only).
- No changes to the autocomplete dropdown sizing in InputBox.

## Decisions

### 1. Shared `useResizable` composable for drag logic

Pointer-based drag resize follows a common pattern across all three panels: listen for pointerdown on a handle, track pointermove deltas, update a reactive value within clamped bounds. Extract this into `src/composables/useResizable.ts` that accepts a ref, min/max bounds, and an axis direction.

**Alternative considered:** Inline the drag logic in each component. Rejected because three identical mousedown/mousemove/mouseup patterns create duplication and drift.

### 2. Pinia `layoutStore` for reactive sizes + persistence

Panel sizes need to be reactive (so layout reflows immediately during drag) and persistent (so the user's preferences survive restarts). Use a new `src/stores/layout.ts` Pinia store that holds `sidebarWidth`, `inputHeight`, and `devPanelHeight` as reactive refs, and persists them to `localStorage` on change. Components read from the store and bind sizes via computed properties or style bindings.

**Alternative considered:** Use component-local refs with `provide/inject`. Rejected because DevPanel needs the sidebar width (for its `left` offset), and prop-drilling through AppLayout is brittle as more panels are added.

### 3. CSS custom property for sidebar width propagation

The sidebar width is needed by both `AppLayout.vue` (for the `flex-basis`) and `DevPanel.vue` (for its `left` fixed position). Instead of prop drilling, set a `--sidebar-width` CSS custom property on the root layout element from the store. DevPanel reads it via its own style binding.

**Alternative considered:** Expose the width through Pinia and bind `:style` directly. Similar effect, but the CSS custom property approach makes it easier for future components to reference the sidebar width without store imports.

### 4. Sidebar resize via flex-basis binding + CSS custom property

In `AppLayout.vue`, replace the hardcoded `width: 280px; min-width: 280px` with a computed dynamic `:style` binding on `.sidebar` that sets `flex-basis` and `min-width` from the store. Insert a narrow (4px) handle element between the sidebar and main content. Users can also double-click the handle to reset to the default width.

**Alternative considered:** Use CSS `resize: horizontal` on the sidebar. Rejected because native CSS resize handles are inconsistent across platforms and cannot enforce min/max in all cases.

### 5. Input area resize via explicit height binding

In `ChatWindow.vue`, the input section currently relies on natural content height (textarea auto-grow capped at 160px). The resize change replaces the auto-grow cap with a user-controlled height: add a horizontal resize handle above `InputBox` that adjusts a height value. The textarea's `max-height` is determined by the available space within the resized container rather than a hard limit.

**Alternative considered:** Keep auto-grow and add a manual resize override. This creates conflicting behaviors. Better to replace the auto-grow approach entirely for the input container.

### 6. Default sizes and persistence strategy

| Panel | Default | Min | Max |
|-------|---------|-----|-----|
| Sidebar width | 280px | 200px | 500px |
| Input area height | 120px | 60px | 50vh |
| DevPanel height | 250px | 100px | 60vh |

Defaults are stored in a `DEFAULTS` constant. On first launch (no `localStorage` entry), defaults are used. When the user double-clicks a resize handle, the panel resets to its default. Persistence uses `localStorage` with the key prefix `layout:` — no IPC or main-process involvement needed since sizes are renderer-only preferences.

## Risks / Trade-offs

- DevPanel `left` position breaks if sidebar width changes while dev panel is hidden → The store always provides the current sidebar width, and DevPanel reads it from the CSS custom property regardless of visibility.
- Dragging a resize handle near a scrollable area could cause scroll jitter → Add `user-select: none` and `pointer-events: none` to adjacent panels during active drag via a drag-active CSS class on the app root.
- Persisted sizes could become invalid if the window is resized to be smaller than stored values → Clamp restored values to current viewport-relative maxes (e.g., sidebar cannot exceed 50% of window width).
- `InputBox` currently has an auto-grow textarea behavior — replacing with container-level resize means textarea scrolls within the container → This is intentional; the textarea should have `overflow-y: auto` and fill the container height.
