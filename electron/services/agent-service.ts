import {
  convStatus,
  convTrustMode,
  pendingConfirmations,
  TOKEN_LIMIT,
  type AgentStatusSnapshot,
} from "./agent-shared";

export { AgentLoop } from "./agent-loop";
export { type AgentRunOptions, type AgentStatusSnapshot } from "./agent-shared";

export function getAgentStatus(convId: string): AgentStatusSnapshot {
  return (
    convStatus.get(convId) || {
      convId,
      state: "idle",
      round: 0,
      maxTurns: 50,
      tokenCount: 0,
      tokenLimit: TOKEN_LIMIT,
      tokenPercent: 0,
      toolLogs: [],
      lastCompression: null,
    }
  );
}

export function setTrustMode(convId: string, enabled: boolean) {
  convTrustMode.set(convId, enabled);
}

export function resolveConfirmation(askId: string, approved: boolean) {
  const pending = pendingConfirmations.get(askId);
  if (pending) {
    pending.resolve(approved);
    pendingConfirmations.delete(askId);
  }
}
