import { TOKEN_LIMIT, type AgentStatusSnapshot } from "./agent-shared";
import { setConversationTrustMode, getConversationTrustMode } from "../db/conversations";
import { conversationRegistry } from "./conversation-registry";

export { AgentLoop } from "./agent-loop";
export { type AgentRunOptions, type AgentStatusSnapshot } from "./agent-shared";

export function getAgentStatus(convId: string): AgentStatusSnapshot {
  const runtime = conversationRegistry.peek(convId);
  if (runtime) return runtime.status;
  return {
    convId,
    state: "idle",
    round: 0,
    maxTurns: 50,
    tokenCount: 0,
    tokenLimit: TOKEN_LIMIT,
    tokenPercent: 0,
    toolLogs: [],
    lastCompression: null,
  };
}

export function setTrustMode(convId: string, enabled: boolean) {
  // Double-write: in-memory runtime mirror + DB persistence
  conversationRegistry.get(convId).trustMode = enabled;
  setConversationTrustMode(convId, enabled);
}

export function loadTrustModeFromDb(convId: string): boolean {
  const value = getConversationTrustMode(convId);
  conversationRegistry.get(convId).trustMode = value;
  return value;
}

export function resolveConfirmation(convId: string, askId: string, approved: boolean) {
  const runtime = conversationRegistry.peek(convId);
  if (!runtime) return;
  runtime.resolveAsk(askId, approved);
}
