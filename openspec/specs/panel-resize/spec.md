# panel-resize Specification

## Purpose
TBD - created by archiving change resizable-panels. Update Purpose after archive.
## Requirements
### Requirement: Sidebar horizontal resize

The system SHALL allow users to resize the sidebar width by dragging a vertical handle positioned between the sidebar and the main content area.

#### Scenario: Drag sidebar resize handle right to widen

- **WHEN** the user presses the pointer down on the resize handle between sidebar and main content, drags right by 50px, and releases
- **THEN** the sidebar width increases by 50px from its current value

#### Scenario: Drag sidebar resize handle left to narrow

- **WHEN** the user presses the pointer down on the resize handle, drags left by 30px, and releases
- **THEN** the sidebar width decreases by 30px from its current value

#### Scenario: Sidebar respects minimum width

- **WHEN** the user drags the resize handle left such that sidebar width would fall below 200px
- **THEN** the sidebar width is clamped to 200px and does not shrink further

#### Scenario: Sidebar respects maximum width

- **WHEN** the user drags the resize handle right such that sidebar width would exceed 500px
- **THEN** the sidebar width is clamped to 500px and does not expand further

#### Scenario: Double-click resize handle resets sidebar to default

- **WHEN** the user double-clicks the resize handle between sidebar and main content
- **THEN** the sidebar width resets to its default value of 280px

#### Scenario: Resize handle shows visual feedback on hover

- **WHEN** the user hovers over the resize handle
- **THEN** the handle changes appearance (e.g., color or background) to indicate it is interactive, and the cursor changes to `col-resize`

#### Scenario: Resize handle shows visual feedback during drag

- **WHEN** the user is actively dragging the resize handle
- **THEN** the handle is visually highlighted and text selection is disabled across the application

### Requirement: Input area vertical resize

The system SHALL allow users to resize the chat input area height by dragging a horizontal handle above the input box.

#### Scenario: Drag input resize handle up to expand

- **WHEN** the user presses the pointer down on the handle above the input box, drags up by 40px, and releases
- **THEN** the input area height increases by 40px from its current value

#### Scenario: Drag input resize handle down to shrink

- **WHEN** the user presses the pointer down on the handle, drags down by 20px, and releases
- **THEN** the input area height decreases by 20px from its current value

#### Scenario: Input area respects minimum height

- **WHEN** the user drags the resize handle down such that input area height would fall below 60px
- **THEN** the input area height is clamped to 60px and does not shrink further

#### Scenario: Input area respects maximum height

- **WHEN** the user drags the resize handle up such that input area height would exceed 50% of viewport height
- **THEN** the input area height is clamped to 50vh and does not expand further

#### Scenario: Double-click input resize handle resets to default

- **WHEN** the user double-clicks the input area resize handle
- **THEN** the input area height resets to its default value of 120px

### Requirement: Panel size persistence

The system SHALL persist panel size preferences across application restarts.

#### Scenario: Sizes are saved on change

- **WHEN** the user resizes any panel and releases the drag
- **THEN** the new size SHALL be saved to persistent storage (localStorage) immediately

#### Scenario: Sizes are restored on launch

- **WHEN** the application starts and previously saved panel sizes exist in storage
- **THEN** all panels SHALL display at their saved sizes
- **AND** all size constraints (min/max) SHALL be enforced on restored values

#### Scenario: Default sizes used on first launch

- **WHEN** the application starts and no saved panel sizes exist in storage
- **THEN** all panels SHALL display at their default sizes (sidebar: 280px, input: 120px, developer panel: 280px)

### Requirement: Developer panel horizontal resize

The system SHALL allow users to resize the developer panel width by dragging a vertical handle on the left edge of the panel, which sits to the right of the main chat content area in the flex layout.

#### Scenario: Drag dev panel left edge left to widen

- **WHEN** the user presses the pointer down on the left edge of the developer panel, drags left by 40px, and releases
- **THEN** the developer panel width SHALL increase by 40px from its current value

#### Scenario: Drag dev panel left edge right to narrow

- **WHEN** the user presses the pointer down on the left edge of the developer panel, drags right by 30px, and releases
- **THEN** the developer panel width SHALL decrease by 30px from its current value

#### Scenario: Dev panel respects minimum width

- **WHEN** the user drags the dev panel left edge right such that panel width would fall below 200px
- **THEN** the developer panel width SHALL be clamped to 200px and does not shrink further

#### Scenario: Dev panel respects maximum width

- **WHEN** the user drags the dev panel left edge left such that panel width would exceed 40% of viewport width
- **THEN** the developer panel width SHALL be clamped to 40vw and does not expand further

#### Scenario: Double-click resize handle resets dev panel to default

- **WHEN** the user double-clicks the resize handle on the left edge of the developer panel
- **THEN** the developer panel width SHALL reset to its default value of 280px

#### Scenario: Dev panel toggle via keyboard shortcut

- **WHEN** the user presses `Ctrl+D`
- **THEN** the developer panel visibility SHALL toggle between shown and hidden

#### Scenario: Dev panel is visible by default

- **WHEN** the application starts
- **THEN** the developer panel SHALL be visible at its configured width on the right side of the workbench

#### Scenario: Hiding dev panel uses collapsed width instead of removal

- **WHEN** the developer panel is hidden (via `Ctrl+D`)
- **THEN** the panel SHALL collapse to zero width with `overflow: hidden` rather than being removed from the DOM, so the chat area width remains stable

