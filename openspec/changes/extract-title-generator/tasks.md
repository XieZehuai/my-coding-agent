## 1. Create standalone title generator

- [ ] 1.1 Create `electron/services/title-generator.ts` with exported `generateTitle(convId: string, projectPath: string)` function. Body: read recent messages via `listMessages(convId).slice(-4)`, read config via `readConfig(projectPath)`, construct LLM prompt, call `new OpenAIClient().chat(...)`, truncate to 15 chars, call `renameConversation(convId, title)`, call `emitToRenderer(IPC.EVENT_TITLE_GENERATED, { convId, title })`. Wrap everything in try/catch with silent catch. Use independent `new AbortController().signal`.

## 2. Remove title generation from AgentLoop

- [ ] 2.1 In `agent-loop.ts`, remove the `generateTitle()` private method (lines 389–418).
- [ ] 2.2 In `doStreaming()`, replace `this.generateTitle()` with `this.options.onFirstTurnComplete?.()` at the same trigger point (after confirming `!hasAssistantResponse(this.ctx.history)` and `toolCalls.length === 0`).
- [ ] 2.3 Remove unused imports from `agent-loop.ts` that were only used by `generateTitle()`: `renameConversation` from `../db/conversations`, and `ChatMessage` if no longer needed elsewhere (verify: `ChatMessage` is still used in `summarizeContext` and `doStreaming` — keep it).

## 3. Wire callback in chat-service

- [ ] 3.1 In `agent-shared.ts`, add `onFirstTurnComplete?: () => void` to `AgentRunOptions` interface.
- [ ] 3.2 In `chat-service.sendChatMessage`, pass `onFirstTurnComplete: () => { generateTitle(convId, project.path); }` when constructing `AgentRunOptions`.
- [ ] 3.3 Import `generateTitle` from `./title-generator` in `chat-service.ts`.

## 4. Verification

- [ ] 4.1 Run `npx vue-tsc --noEmit`, fix all type errors.
- [ ] 4.2 Manual test: start a new conversation, send a first message, wait for completion. Verify title is generated and displayed (same behavior as before).
- [ ] 4.3 Manual test: send a second message in the same conversation. Verify title is NOT regenerated (only first turn triggers it).
- [ ] 4.4 Manual test: create a conversation, send a message that triggers tool calls (e.g., "read package.json"). Verify title generation is skipped (not first text-only response).
