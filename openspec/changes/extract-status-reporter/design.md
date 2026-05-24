## Decisions

### Decision 1: StatusReporter as a thin wrapper, not an event bus

Phase 5 introduces a single reporter that wraps `emitToRenderer`. Future phases may extend it to queue/batch events, filter by convId, or log. But Phase 5 scope is minimal: consolidate existing emit calls.

### Decision 2: Throttle logic lives in StatusReporter

Currently `throttledEmitStatus()` is a private AgentLoop method. Moving it to StatusReporter means the throttling can be reused by any future emitter (e.g., if StreamRunner wants to emit status during streaming).

## Risks
- **[Risk] Over-abstraction for a single consumer.** AgentLoop is the only component emitting status. Mitigation: StreamRunner (Phase 3) may want to emit status during long-running streams. Having a shared reporter avoids duplication.
