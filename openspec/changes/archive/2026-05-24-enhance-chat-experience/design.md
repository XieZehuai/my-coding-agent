## Context

The renderer currently provides the core chat workspace through Vue components under `src/components/chat`. The existing implementation has the right functional pieces, but the chat surface lacks strong hierarchy: user and assistant messages are visually similar, tool calls are hard to scan while streaming, the input area feels like a basic textarea, and some icon/status strings are fragile because they rely on HTML entities or mojibake-prone characters.

This change is limited to renderer UI and interaction polish. It must keep existing stores, IPC channels, database schema, agent engine behavior, and tool execution semantics intact.

## Goals / Non-Goals

**Goals:**

- Make the chat transcript easier to scan during coding work.
- Make assistant streaming and tool execution state legible without opening every detail panel.
- Make the input composer feel stable, deliberate, and suitable for multi-line prompts.
- Make trust mode visibly explicit instead of icon-only.
- Remove fragile encoded icon/status text from the chat surface.

**Non-Goals:**

- No changes to agent behavior, tool schemas, permissions, or IPC contracts.
- No new design system or external component library.
- No changes to persistence, export/import format, or conversation data model.
- No full application layout redesign outside the chat surface.

## Decisions

### 1. Keep the change renderer-only

The chat experience issues are presentation and state communication problems. Existing stores already expose messages, streaming segments, tool status, selected conversation, and trust mode. Keeping the change renderer-only avoids unnecessary risk in the agent engine and IPC layer.

Alternative considered: add richer message metadata from the main process. This is deferred because role, time, segment type, and tool status are already available in the renderer.

### 2. Use structured message panels instead of simple colored blocks

Each message should present a role marker, timestamp, content panel, and role-specific visual treatment. This provides transcript rhythm without turning the interface into a decorative chat app.

Alternative considered: keep full-width flat blocks and only adjust colors. That would preserve the current prototype feel and would not materially improve scanability.

### 3. Treat tool calls as execution cards

Tool calls should show a stable status indicator, tool name, status label, argument preview, and expandable body for arguments/results/errors. Errors should open by default so failures are immediately visible.

Alternative considered: always render tool details expanded. That would make long agent sessions noisy and reduce the value of a concise transcript.

### 4. Separate streaming presentation from saved message presentation

The active assistant response should use its own panel with a live status and waiting/cursor feedback. Once completed, it can become a normal assistant message. This distinction makes in-progress work feel alive while preserving a clean transcript after completion.

Alternative considered: reuse the exact saved message bubble for streaming. That reduces component-specific CSS, but makes it harder to communicate live status and empty initial waiting state.

### 5. Upgrade the input box into a composer

The bottom input should remain a textarea, but it should be wrapped in a composer shell with focus state, readiness text, character count, and a consistent multi-line height. Send/cancel actions should remain stable beside or below the composer depending on viewport width.

Alternative considered: add a complex toolbar with prompt actions. This is out of scope; the goal is to improve the existing prompt workflow without adding new commands.

### 6. Use text and CSS markers instead of fragile icon entities

Critical states such as trust mode and tool status should use explicit text plus CSS dots/badges. This avoids rendering issues from HTML entities inside Vue interpolation and keeps state understandable even if custom symbols fail.

Alternative considered: introduce an icon package. This would add dependency and bundling scope for a small polish change.

## Risks / Trade-offs

- Visual changes could reduce information density -> Keep panels compact, use small metadata text, and avoid large decorative elements.
- Duplicated markdown/tool styles between saved and streaming messages could drift -> Keep styling intentionally parallel and validate both states during implementation.
- Browser-only preview can fail because the app expects Electron `window.api` -> Verify with renderer build and, where possible, Electron/dev-server testing.
- More structured CSS could affect narrow windows -> Include responsive rules for message panels and composer actions.
