## 1. Create StreamRunner class

- [ ] 1.1 Create `electron/services/stream-runner.ts` with `StreamRunner` class: constructor takes `(convId: string, config: ApiConfig, client: OpenAIClient)`. Exported `run(messages: ChatMessage[], signal: AbortSignal): Promise<{ content: string; reasoningContent: string; toolCalls: ToolCall[] }>` method. Body: identical to the current `doStreaming` lines 108–155 (chatStream call + delta accumulation + emit + error handling), minus the token-threshold check and the post-stream persistence/state logic.

## 2. Inject StreamRunner into AgentLoop

- [ ] 2.1 In `agent-loop.ts`, add `streamRunner: StreamRunner` field and accept it in constructor: `new AgentLoop(options, runtime, streamRunner)`.
- [ ] 2.2 Replace `doStreaming()` body: the compression check stays; the `chatStream` block replaced by `const result = await this.streamRunner.run(this.ctx.messages, this.ctx.signal);` with try/catch for cancellation/error handling. Save assistant message, push to context messages, and decide next state — these stay in `doStreaming()`.
- [ ] 2.3 Remove `content`, `reasoningContent`, `toolCalls`, `streamError` local variables from `doStreaming()` — they're now in StreamRunner.
- [ ] 2.4 Remove unused imports: `TOOL_DEFINITIONS` from `doStreaming` (now in StreamRunner), verify other usages remain.

## 3. Wire in chat-service

- [ ] 3.1 In `chat-service.sendChatMessage`, construct `new StreamRunner(convId, config, client)` and pass to `new AgentLoop(options, runtime, streamRunner)`.
- [ ] 3.2 Import `StreamRunner` from `./stream-runner`.

## 4. Verification

- [ ] 4.1 Run `npx vue-tsc --noEmit`, fix all type errors.
- [ ] 4.2 Manual test: send a message, verify streaming tokens appear in real-time (same as before).
- [ ] 4.3 Manual test: send a message that triggers tool calls, verify tool calls are accumulated and executed correctly.
- [ ] 4.4 Manual test: cancel during streaming, verify cancellation works.
