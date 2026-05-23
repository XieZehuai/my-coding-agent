## 1. Resize Infrastructure

- [x] 1.1 Create `src/stores/layout.ts` Pinia store with reactive `sidebarWidth`, `inputHeight`, `devPanelHeight` refs, default constants, and localStorage persistence.
- [x] 1.2 Create `src/composables/useResizable.ts` composable that accepts a ref, min/max bounds, axis direction, and double-click reset callback — provides pointer event handlers and drag state.
- [x] 1.3 Create `src/components/layout/ResizeHandle.vue` presentational component with axis (`horizontal`/`vertical`) and active-state props, emitting resize events.

## 2. Sidebar Resize

- [x] 2.1 Update `AppLayout.vue` to use `layoutStore.sidebarWidth` in a dynamic `:style` binding on `.sidebar` (replacing fixed `width` and `min-width`).
- [x] 2.2 Add a vertical `ResizeHandle` between `.sidebar` and `.main-content` in `AppLayout.vue`, wired to `useResizable` for horizontal drag.
- [x] 2.3 Inject `--sidebar-width` CSS custom property on `.app-layout` from the store, updated reactively.

## 3. Input Area Resize

- [x] 3.1 Update `ChatWindow.vue` to use `layoutStore.inputHeight` for a dynamic height on the `InputBox` container wrapper.
- [x] 3.2 Add a horizontal `ResizeHandle` between `MessageList` and `InputBox` in `ChatWindow.vue`, wired to `useResizable` for vertical drag.
- [x] 3.3 Update `InputBox.vue` textarea styles: remove hardcoded `max-height: 160px`, set `height: 100%` and `overflow-y: auto` to fill the resizable container.
- [x] 3.4 Update `InputBox.vue` `handleInput` auto-grow logic to respect the container height instead of a fixed pixel cap.

## 4. Dev Panel Resize

- [x] 4.1 Update `DevPanel.vue` to replace hardcoded `left: 280px` with a dynamic binding reading `--sidebar-width` via `layoutStore.sidebarWidth`.
- [x] 4.2 Replace `DevPanel.vue` hardcoded `max-height: 250px` with `layoutStore.devPanelHeight` as the explicit height, removing the `max-height` constraint.
- [x] 4.3 Add a horizontal `ResizeHandle` on the top edge of `.dev-panel` in `DevPanel.vue`, wired to `useResizable` for vertical drag (inverted: drag up increases height).

## 5. Drag UX Polish

- [x] 5.1 Add `user-select: none` on `.app-layout` via a `.is-resizing` CSS class toggled by `useResizable` drag state to prevent text selection during drag.
- [x] 5.2 Add hover and active visual states for resize handles (background color transition, cursor change to `col-resize` / `row-resize`).
- [x] 5.3 Clamp restored panel sizes to viewport-relative maximums on app mount to handle window resize between sessions.

## 6. Verification

- [x] 6.1 Run `npm run build` to verify TypeScript compilation and Vite build succeed.
- [ ] 6.2 Manually verify sidebar drag resizes correctly, respects min (200px)/max (500px), double-click resets to 280px, and DevPanel `left` offset tracks sidebar width.
- [ ] 6.3 Manually verify input area drag resizes correctly, respects min (60px)/max (50vh), double-click resets to 120px, and textarea fills the container.
- [ ] 6.4 Manually verify dev panel drag resizes correctly, respects min (100px)/max (60vh), and toggle visibility preserves the configured height.
- [ ] 6.5 Verify panel sizes persist: resize panels, restart the app, confirm sizes are restored.
