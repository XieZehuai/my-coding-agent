## 1. Create StatusReporter

- [ ] 1.1 Create `electron/services/status-reporter.ts` with `StatusReporter` class containing `reportStatus(convId, snapshot)` (throttled) and `reportEvent(convId, channel, data)` (passthrough). Throttling: 500ms window via `Map<convId, number>` tracking last emit time.

## 2. Use StatusReporter in AgentLoop

- [ ] 2.1 Remove `emitStatus()` and `throttledEmitStatus()` private methods from AgentLoop.
- [ ] 2.2 Replace all `this.emitStatus()` calls with `this.reporter.reportStatus(...)` and `this.throttledEmitStatus()` with `this.reporter.reportStatus(...)` (already throttled).
- [ ] 2.3 Replace direct `emitToRenderer(...)` calls in `agent-loop.ts` (e.g. error/cancelled emits) with `this.reporter.reportEvent(...)`.

## 3. Verification

- [ ] 3.1 Run `npx vue-tsc --noEmit`.
- [ ] 3.2 Manual test: send message, verify DevPanel status updates.
