## 1. Layout Store Updates

- [x] 1.1 Update `layout.ts` constraints and defaults: change `devPanelHeight` default from 250 to 280, min from 100 to 200, max from 60vh to 40vw.
- [x] 1.2 Rename `devPanelHeight` ref to `devPanelWidth` in the store, keeping `layout:devPanelHeight` as the localStorage key for backward compatibility.

## 2. DevPanel Component Rework

- [x] 2.1 Remove `position: fixed`, `bottom`, `right`, `left` CSS from `.dev-panel`; replace with `width` binding from the store and `height: 100%` (fills parent height).
- [x] 2.2 Change `isVisible` default from `false` to `true`.
- [x] 2.3 Switch resize composable from `axis: 'vertical'` to `axis: 'horizontal'`.
- [x] 2.4 Move the `ResizeHandle` from the top edge to the left edge of the panel, with double-click reset to 280.
- [x] 2.5 Replace `v-if="isVisible"`/`v-else` toggle pattern with a `:style` binding that sets `width: 0; overflow: hidden` when hidden, keeping the panel in the DOM.
- [x] 2.6 Add a CSS media query: when panel width is below 320px, switch `.panel-body` grid to single column.
- [x] 2.7 Update content layout: stack sections vertically (token usage, agent state, tool log) instead of the three-column horizontal grid, optimizing for the narrower right-panel format.

## 3. AppLayout Integration

- [x] 3.1 Update `AppLayout.vue` to add the DevPanel as a flex child after `.main-content` (layout: `sidebar | main-content | dev-panel`).
- [x] 3.2 Ensure DevPanel renders inside the normal flow (not fixed) — the `.app-layout` flex container positions it naturally.

## 4. Verification

- [x] 4.1 Run TypeScript type-check to verify no compilation errors.
- [x] 4.2 Manually verify the dev panel appears on the right side by default.
- [x] 4.3 Manually verify dragging the left edge resizes panel width (min 200px, max 40vw), with correct horizontal drag direction.
- [x] 4.4 Manually verify `Ctrl+D` toggles panel visibility, and chat area adjustments are smooth.
- [x] 4.5 Manually verify panel width persists across app restarts.
