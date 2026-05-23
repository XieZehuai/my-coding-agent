## ADDED Requirements

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

### Requirement: Developer panel vertical resize

The system SHALL allow users to resize the developer panel height by dragging its top edge.

#### Scenario: Drag dev panel top edge up to expand

- **WHEN** the user presses the pointer down on the top edge of the developer panel, drags up by 30px, and releases
- **THEN** the dev panel height increases by 30px from its current value

#### Scenario: Drag dev panel top edge down to shrink

- **WHEN** the user presses the pointer down on the top edge of the developer panel, drags down by 50px, and releases
- **THEN** the dev panel height decreases by 50px from its current value

#### Scenario: Dev panel respects minimum height

- **WHEN** the user drags the dev panel top edge down such that panel height would fall below 100px
- **THEN** the dev panel height is clamped to 100px and does not shrink further

#### Scenario: Dev panel respects maximum height

- **WHEN** the user drags the dev panel top edge up such that panel height would exceed 60% of viewport height
- **THEN** the dev panel height is clamped to 60vh and does not expand further

#### Scenario: Dev panel horizontal position tracks sidebar width

- **WHEN** the sidebar width is changed to 350px (via drag)
- **THEN** the developer panel's `left` CSS offset also updates to 350px so it remains aligned with the main content area

### Requirement: Panel size persistence

The system SHALL persist panel size preferences across application restarts.

#### Scenario: Sizes are saved on change

- **WHEN** the user resizes any panel and releases the drag
- **THEN** the new size is saved to persistent storage (localStorage) immediately

#### Scenario: Sizes are restored on launch

- **WHEN** the application starts and previously saved panel sizes exist in storage
- **THEN** all panels display at their saved sizes
- **AND** all size constraints (min/max) are enforced on restored values

#### Scenario: Default sizes used on first launch

- **WHEN** the application starts and no saved panel sizes exist in storage
- **THEN** all panels display at their default sizes (sidebar: 280px, input: 120px, dev panel: 250px)
