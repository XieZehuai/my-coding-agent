## Context

The developer diagnostics panel currently sits as a `position: fixed` overlay at the bottom of the viewport. When visible, it covers the bottom portion of the chat window including the input area. Users must close it to type or read messages, making it a contextual-action panel rather than a persistent status surface.

This change moves the panel into the main flex layout as a right-side companion to the chat content, making it a passive status zone that's always visible. It builds on the recently-added `panel-resize` and `useResizable` infrastructure.

## Goals / Non-Goals

**Goals:**
- Reposition the developer panel from a bottom-fixed overlay to a right-side flex panel.
- Make the panel visible by default so agent status is always glanceable.
- Convert the resize handle from vertical (height) to horizontal (width).
- Keep `Ctrl+D` as a toggle to hide/show the panel.
- Preserve all existing panel content and data bindings.

**Non-Goals:**
- No changes to the data source (`window.api.onStatus`), tool log format, or token usage display.
- No changes to sidebar or input area resize behavior.
- No new tabs or sections in the panel.
- No layout reordering for mobile or narrow widths.

## Decisions

### 1. Move DevPanel from fixed overlay to flex child of `.app-layout`

Instead of `position: fixed; bottom: 0; right: 0`, the panel becomes a `flex-shrink: 0` child between `.main-content` and the right edge. The flex layout becomes: `sidebar | main-content | dev-panel`. This eliminates the z-index stacking and makes the chat area shrink naturally when the panel is open.

**Alternative considered:** Keep the panel fixed but reposition to `top: 0; right: 0; height: 100vh; bottom: auto`. Rejected because fixed elements don't participate in flex flow and would still overlay content unless the main area has an explicit right margin.

### 2. Default visibility changed to `true`

The `isVisible` ref initializes to `true` instead of `false`. The collapsed toggle button is removed since the panel is now part of the layout. `Ctrl+D` remains bound to toggle visibility. When hidden, the panel slot collapses to `width: 0` (with `overflow: hidden`) rather than `v-if` removal, so the flex layout doesn't jump.

**Alternative considered:** Use `v-if` to remove the panel entirely when hidden. Rejected because the flex layout would reflow, causing a jarring jump of the chat area width.

### 3. Resize axis changed from vertical to horizontal

The `useResizable` composable call in DevPanel switches from `axis: 'vertical'` to `axis: 'horizontal'`. The resize handle moves from the top edge to the left edge of the panel. The store key `devPanelHeight` is reused but now represents panel width.

### 4. Updated constraints and defaults

| Property | Before | After |
|----------|--------|-------|
| Store key | `devPanelHeight` | `devPanelHeight` (reused, now means width) |
| Default | 250px | 280px |
| Min | 100px | 200px |
| Max | 60vh | 40vw |

**Alternative considered:** Rename the store key to `devPanelWidth` with a migration path. Rejected because the localStorage migration complexity outweighs the clarity benefit — the key name is internal to the store and only used within the layout code.

### 5. Panel content layout adjusts to narrow width

When the right panel is narrow (200px minimum), the three-column grid layout becomes a single-column stack. This is handled via a CSS media query: below 320px panel width, the grid switches to `grid-template-columns: 1fr`.

**Alternative considered:** Keep the three-column grid regardless of width. Rejected because at 200px each column would be ~60px wide, making text unreadable.

## Risks / Trade-offs

- Right panel reduces available chat width (up to 40% of viewport) → The panel defaults to a modest 280px and users can collapse it with `Ctrl+D` or resize narrower.
- LocalStorage `layout:devPanelHeight` from before this change will be interpreted as width → The value (likely ~250px from the old default) falls within the new min/max range (200-40vw), so no functional breakage — just slightly narrower than the new 280px default.
- Panel content (tool log entries) may wrap awkwardly at narrow widths → Use `overflow: hidden; text-overflow: ellipsis` as already present on tool log entries.
