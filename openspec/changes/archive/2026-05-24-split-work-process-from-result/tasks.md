## 1. Segment Model & Store Refactor

- [x] 1.1 Add `{ type: "reasoning", content: string }` to `Segment` union type in `src/stores/chat.ts`
- [x] 1.2 Remove `reasoningContent?: string` from `DisplayMessage`, add `duration?: number`
- [x] 1.3 Add `responseStartTime: number | null` to chat store state
- [x] 1.4 Update `startStreaming()` to record `responseStartTime = Date.now()`
- [x] 1.5 Refactor `appendReasoning(token)` to push `{ type: "reasoning", content: token }` into `streamingSegments`
- [x] 1.6 Remove `streamingReasoning` ref — reasoning now flows through `streamingSegments`
- [x] 1.7 Update `finishStreaming()` to compute `duration = Date.now() - responseStartTime` and store on new `DisplayMessage`; reset `responseStartTime`
- [x] 1.8 Update `mergeMessages()` to convert legacy `Message.reasoningContent` into a reasoning segment prepended to the segment list
- [x] 1.9 Verify TypeScript compilation (`npx vue-tsc --noEmit`) passes for store changes

## 2. MessageBubble Rework

- [x] 2.1 Add `splitSegments()` utility to classify segments into `workSegments` and `resultSegments` based on trailing-text rule
- [x] 2.2 Add work process collapsible section: header with step count and toggle, expand/collapse via local `ref`
- [x] 2.3 Render reasoning segments as collapsible "Thinking" blocks within work process section
- [x] 2.4 Render intermediate text segments inline within work process section
- [x] 2.5 Render tool call cards within work process section (reuse existing card styles)
- [x] 2.6 Add always-visible result section rendering final text segments
- [x] 2.7 Add duration badge to message header (`formatDuration` utility for "3.2s" display)
- [x] 2.8 Handle edge cases: no work process (skip collapsible), no result (show placeholder), no segments at all (should not happen but guard)
- [x] 2.9 Ensure duration badge is only shown for assistant messages with `duration` present

## 3. MessageList Streaming Panel Update

- [x] 3.1 Update streaming panel to render reasoning segments interleaved with text and tool calls (remove separate `streamingReasoning` details block)
- [x] 3.2 Add live elapsed time counter in streaming panel header (computed from `responseStartTime` to `Date.now()`)
- [x] 3.3 Remove `streamingReasoning` references from MessageList template
- [x] 3.4 Ensure smooth visual transition when streaming completes (live panel → split MessageBubble)

## 4. Verification

- [x] 4.1 Run `npx vue-tsc --noEmit` and fix any type errors
- [ ] 4.2 Visual check: assistant message with tools renders collapsed work process + visible result
- [ ] 4.3 Visual check: assistant message with only text shows result with no collapsible
- [ ] 4.4 Visual check: expand/collapse toggle works on work process section
- [ ] 4.5 Visual check: duration badge appears correctly on completed messages
- [ ] 4.6 Visual check: live timer visible during streaming
- [ ] 4.7 Visual check: reasoning blocks render as collapsible thinking sections in correct chronological position
