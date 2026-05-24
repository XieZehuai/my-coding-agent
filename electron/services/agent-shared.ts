import { AgentState, ToolLogEntry } from "../../shared/types";

export const TOKEN_LIMIT = 120000;
export const COMPRESSION_THRESHOLD = 0.9;

export interface AgentRunOptions {
  convId: string;
  projectId: string;
  projectPath: string;
  userContent: string;
  fileContents: Map<string, string>;
  signal: AbortSignal;
  trustMode: boolean;
  customPrompt?: string;
}

export interface AgentStatusSnapshot {
  convId: string;
  state: AgentState;
  round: number;
  maxTurns: number;
  tokenCount: number;
  tokenLimit: number;
  tokenPercent: number;
  toolLogs: ToolLogEntry[];
  lastCompression: number | null;
}
