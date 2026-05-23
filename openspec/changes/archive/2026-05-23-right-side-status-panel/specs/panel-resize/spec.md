## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Developer panel vertical resize

**Reason**: Replaced by horizontal resize requirement. The developer panel is now a right-side flex panel that resizes horizontally (width) instead of vertically (height).

**Migration**: The `layout:devPanelHeight` localStorage key is reused for the panel width. The old stored value will be interpreted as the new panel width.
