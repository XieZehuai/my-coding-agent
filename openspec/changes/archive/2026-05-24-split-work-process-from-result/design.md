## Context

The current chat renderer uses a flat `DisplayMessage` model where each assistant message contains a `segments` array (text + tool_call entries) and a separate `reasoningContent` string blob. All reasoning is accumulated into one field during streaming, losing interleaved ordering with text and tool calls. Messages render as one undifferentiated block — users must scroll through tool call details to find the final answer.

The agent backend streams tokens via IPC events (`agent:reasoning`, `agent:token`, `agent:tool-start`, `agent:tool-end`, `agent:complete`). The store's `finishStreaming()` merges all accumulated segments into a single `DisplayMessage`. This is the natural unit for the work/result split.

## Goals / Non-Goals

**Goals:**

- Make reasoning a first-class segment type interleaved with text and tool calls, preserving the model's exact output order.
- Split completed assistant messages into collapsible "work process" (reasoning + intermediate text + tool calls) and always-visible "result" (trailing text).
- Collapse work process by default; one click to expand.
- Track and display per-response execution duration.
- Keep the streaming panel (in-progress state) visually consistent with the final split layout.

**Non-Goals:**

- No change to the agent loop, IPC events, or backend streaming protocol.
- No change to database schema or persistent `Message` model. The `Message.reasoningContent` field stays for storage; only the renderer-side `DisplayMessage` is refactored.
- No per-tool-call timing display. Total response time only.
- No automatic code-folding or diff-specific rendering beyond existing markdown.

## Decisions

### 1. Reasoning as a Segment type

**Decision**: Add `{ type: "reasoning", content: string }` to the `Segment` union. Remove `reasoningContent` from `DisplayMessage`. During streaming, `appendReasoning()` pushes reasoning segments into `streamingSegments` instead of a separate string.

**Alternatives considered**:
- *Keep reasoning as a separate field and add ordering metadata* — Complex, requires a parallel ordering array. The segment list already provides linear ordering naturally.
- *Make reasoning a sub-property of text segments* — Confuses two distinct content types; reasoning needs distinct visual treatment (collapsible thinking blocks).

**Rationale**: The segment list is already the canonical ordered representation of agent output. Adding reasoning as another segment type is the minimal change to capture interleaved ordering.

### 2. Split algorithm: trailing text = result

**Decision**: Walk the segment array from the end. Collect contiguous `text` segments as the "result". The first non-text segment encountered (tool_call or reasoning) marks the split point. Everything before that point is "work process".

```
segments: [R₁, text₁, tool₁, R₂, text₂, tool₂, R₃, text₃]
                                                     └── result
          └──────────────────────────────┘────┘
                    work process
```

**Edge cases**:
- Only text, no tools: entire segment list is result, no work process to collapse.
- Only tools/reasoning, no trailing text: all is work process, result shows placeholder "Working..." or is absent.
- During streaming: no split — everything shows live in one panel.

**Alternatives considered**:
- *Split after last tool call (include trailing reasoning in result)* — User chose against; reasoning about formatting is still work.
- *Classifier-based: mark each segment as work/result* — Adds complexity without benefit; the split point is naturally determined by segment order.

### 3. Collapse/expand behavior

**Decision**: Work process defaults to `collapsed` when the message first renders (after streaming completes). Toggle via a clickable header showing step count and combined duration. State is stored locally per message component instance (no persistence needed). Expansion state resets when navigating away and back.

**Rationale**: Users primarily want to see the result. Persistent expansion state would require a store entry per message, adding complexity for marginal benefit.

### 4. Duration tracking

**Decision**: Add `responseStartTime: number | null` to chat store. Set to `Date.now()` in `startStreaming()`. In `finishStreaming()`, compute `duration = Date.now() - responseStartTime` and store on the newly created `DisplayMessage`. Reset `responseStartTime` to `null`.

**Rationale**: Simple, uses existing wall clock, no extra IPC. Accuracy is sufficient for UX purposes (sub-second precision not needed).

### 5. `mergeMessages` refactor for history loading

**Decision**: When loading persisted messages, `mergeMessages()` converts `Message.reasoningContent` into a standalone reasoning segment placed before the message's first text or tool segment (since persisted messages don't have interleaved ordering data). This is a best-effort reconstruction; future streaming produces correctly interleaved segments.

**Alternatives considered**:
- *Store reasoning as interleaved in DB* — Requires migration, changes backend write path. Out of scope for this renderer-only change.

### 6. Streaming panel layout

**Decision**: During active streaming, show all segments (reasoning, text, tool calls) in a single live panel with a "Streaming" badge. Reasoning segments render as collapsible `details` blocks (open by default while live). After completion, the panel transitions to the split layout (work process collapsed, result visible).

**Rationale**: Users want to watch progress in real-time; collapsing during streaming would defeat the purpose. The transition from "fully expanded live view" to "collapsed work / visible result" provides a natural "done" signal.

## Risks / Trade-offs

- **History messages lose interleaving fidelity**: Persisted messages merge reasoning into one segment before the message body. → Acceptable; future new messages have correct interleaving via streaming.
- **`mergeMessages` complexity increases**: The function already handles consecutive assistant message merging. Adding reasoning segment handling adds another branch. → Keep logic isolated in well-named helper functions.
- **Streaming panel may flicker during type transitions**: Switching from live panel to split layout on completion. → Use CSS transitions on the collapse; keep the result content stable during the transition.
