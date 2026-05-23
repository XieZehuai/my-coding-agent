## Why

The current chat UI presents all agent output — reasoning, intermediate tool calls, and final text — as one flat message. Users must scroll through verbose execution details to find the actual result. This mirrors the Codex model: collapse work process (tool calls + intermediate thinking) by default, show only the result, and let users expand to inspect. Additionally, there's no visible timing, so users can't gauge execution cost at a glance.

## What Changes

- **Segment model refactor**: Add `reasoning` as a segment type (`{ type: "reasoning", content }`), removing the separate `reasoningContent` string field from `DisplayMessage`. Reasoning tokens stream interleaved with text and tool calls, preserving the model's exact output order.
- **Work process / result split**: After streaming completes, assistant messages are split into two sections — work process (reasoning, intermediate text, and all tool calls) and result (trailing text segments only). The split point is the last contiguous text-only segment at the end of the segment list.
- **Collapsible work process**: Work process sections are collapsed by default. Users click to expand and inspect reasoning steps, intermediate outputs, and individual tool call results. Result sections are always visible.
- **Per-response duration timing**: Each assistant response records its start time when streaming begins and computes elapsed duration on completion. The total duration is displayed in the message header.
- **Streaming panel update**: During active streaming, reasoning segments render interleaved with text and tool calls in the live streaming panel, matching the final rendered order.

## Capabilities

### New Capabilities

- `message-split`: Segment model with reasoning as first-class segment type; work process / result split algorithm; collapsible rendering (default collapsed work process, always visible result); per-message duration timing and display.

### Modified Capabilities

- `chat-experience`: Message transcript rendering and streaming feedback requirements updated to support interleaved reasoning segments and work process / result split layout.

## Impact

- Affected files:
  - `src/stores/chat.ts` — Segment type, DisplayMessage type, streaming state, mergeMessages logic
  - `src/components/chat/MessageBubble.vue` — Major rework for split rendering
  - `src/components/chat/MessageList.vue` — Streaming panel update for interleaved reasoning
- No IPC contract changes.
- No database, agent engine, tool execution, or API client changes.
- No new runtime dependencies.
