## Context

The current renderer layout is functional but plain: `AppLayout` splits the app into a fixed sidebar and a chat area, while project selection, conversation selection, trust mode, and developer diagnostics live as separate UI islands. For a coding agent, the user needs an environment that feels like a workbench: the active project, selected conversation, agent state, permission posture, and diagnostics should be visible without competing with the chat transcript.

This change builds on the existing Electron/Vue renderer and should reuse the current Pinia stores, IPC handlers, and agent status events. It is broader than `enhance-chat-experience`: that change focuses on message/composer polish, while this change focuses on the app shell and surrounding workbench structure.

## Goals / Non-Goals

**Goals:**

- Make the app feel like a cohesive coding workbench rather than independent panels.
- Keep chat as the primary interaction surface.
- Improve project and conversation navigation density, active states, and empty states.
- Expose agent activity and token usage in compact workbench chrome.
- Make trust/permission posture visible near the conversation context.
- Present developer diagnostics as an integrated drawer.

**Non-Goals:**

- No built-in code editor, file tree editor, or diff editing surface.
- No changes to agent loop behavior, tools, permissions policy, or IPC contracts.
- No new external UI framework or icon dependency.
- No redesign of the message bubble details covered by `enhance-chat-experience`, except for integration with the surrounding shell.
- No cross-platform window chrome work beyond renderer layout.

## Decisions

### 1. Preserve a two-zone workbench layout

The app should keep a left navigation/workspace rail and a main conversation workspace. This matches the current code structure and keeps project/conversation management close to the chat without introducing a third permanent panel.

Alternative considered: add a persistent right inspector. This is deferred because it would reduce chat width and duplicate the developer panel before there is enough inspectable content.

### 2. Add workbench chrome inside existing components

The conversation header should become the primary place for selected conversation title, project context, trust posture, and compact agent status. The sidebar should focus on navigation and workspace identity. The developer panel should become a bottom drawer tied to diagnostics.

Alternative considered: create a top-level global toolbar. That risks adding another layer of UI above the chat and making the app feel more like a generic dashboard.

### 3. Reuse existing status data

Agent state, round, token count, token percentage, and tool logs already flow through the existing status mechanism used by `DevPanel`. The workbench should reuse that data rather than adding new IPC.

Alternative considered: add new summary IPC endpoints. This would create redundant state paths and increase testing surface without new data needs.

### 4. Treat trust mode as part of permission posture

Trust mode should remain a per-conversation action, but the UI should frame it as the current safety posture of the workspace. The header should provide a compact state indicator, while deeper permission detail can remain in existing modal/panel flows.

Alternative considered: move trust mode into the sidebar. That separates a conversation-scoped control from the selected conversation and makes it easier to misread the scope.

### 5. Keep visual language restrained and utilitarian

A Codex-style workbench should be dense, readable, and calm: compact controls, strong active states, low ornamentation, and no marketing-style hero treatment. Components should use existing colors and CSS rather than a new design system.

Alternative considered: introduce a dramatic themed visual redesign. This would risk distracting from repeated coding workflows and increase CSS churn.

## Risks / Trade-offs

- Workbench chrome could crowd the chat header -> Keep status summaries compact and collapse lower-priority details into the diagnostics drawer.
- Sidebar density could obscure project/conversation hierarchy -> Use clear section labels, active states, and empty states.
- Reusing `DevPanel` status events could miss status before listeners attach -> Keep existing behavior and treat the compact status as best-effort UI, not a source of truth.
- Parallel work with `enhance-chat-experience` could overlap in `ChatWindow.vue` -> Keep this change focused on shell/header integration and avoid rewriting message internals.
- Renderer-only preview may be limited by Electron APIs -> Verify with renderer build and Electron runtime when possible.
