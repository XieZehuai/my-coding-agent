## 1. Workbench Shell

- [x] 1.1 Update `AppLayout.vue` structure and styles to present a cohesive two-zone workbench shell.
- [x] 1.2 Tune global renderer styling in `App.vue` for compact workbench density and consistent surface colors.
- [x] 1.3 Ensure the main conversation workspace remains the dominant area across desktop and narrow widths.

## 2. Workspace Navigation

- [x] 2.1 Refine `ProjectList.vue` active, hover, section header, and empty-state presentation.
- [x] 2.2 Refine `ConversationList.vue` active, hover, timestamp, rename, context-menu, and empty-state presentation.
- [x] 2.3 Add or adjust compact workspace identity cues so the selected project is easy to identify.
- [x] 2.4 Verify long project and conversation names truncate cleanly without breaking layout.

## 3. Conversation Header and Status Chrome

- [x] 3.1 Update `ChatWindow.vue` header to show conversation title and compact project context.
- [x] 3.2 Add compact agent status chrome using existing status data where available.
- [x] 3.3 Add token usage warning and danger visual states in the compact status surface.
- [x] 3.4 Keep header controls stable when titles are long or status changes.

## 4. Permission Posture

- [x] 4.1 Present trust mode as an explicit conversation permission posture in the workbench header.
- [x] 4.2 Preserve existing trust-mode toggle behavior and per-conversation scope.
- [x] 4.3 Ensure pending permission prompts remain prominent and are not hidden by diagnostics or shell chrome.

## 5. Diagnostics Drawer

- [x] 5.1 Restyle `DevPanel.vue` as an integrated bottom diagnostics drawer.
- [x] 5.2 Preserve token usage, agent state, round, and tool log information in the diagnostics drawer.
- [x] 5.3 Keep the diagnostics toggle discoverable without obscuring chat content.
- [x] 5.4 Ensure closing diagnostics returns the layout to the normal conversation workspace.

## 6. Verification

- [x] 6.1 Run the renderer build to verify Vue templates and TypeScript compile.
- [x] 6.2 Verify project and conversation empty states, active states, and long-name truncation.
- [x] 6.3 Verify compact agent status, trust posture, and diagnostics drawer with representative status data.
- [x] 6.4 If an Electron-compatible preview is available, visually inspect the full workbench at desktop and narrow widths.
