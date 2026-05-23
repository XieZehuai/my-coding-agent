import { ChatMessage } from "../api/openai-client";
import { ToolCall, ToolLogEntry } from "../../shared/types";
import { Message } from "../../shared/types";
import { UndoService } from "./undo-service";
import { AgentRunOptions } from "./agent-shared";

export interface AgentContext {
  convId: string;
  projectPath: string;
  messages: ChatMessage[];
  history: Message[];
  round: number;
  maxTurns: number;
  signal: AbortSignal;
  toolLogs: ToolLogEntry[];
  pendingTools: ToolCall[];
  pendingAskId: string | null;
  undoService: UndoService;
}

export function buildAgentContext(
  options: AgentRunOptions,
  undoService: UndoService,
  maxTurns: number,
  messages: ChatMessage[],
  history: Message[]
): AgentContext {
  return {
    convId: options.convId,
    projectPath: options.projectPath,
    messages,
    history,
    round: 1,
    maxTurns,
    signal: options.signal,
    toolLogs: [],
    pendingTools: [],
    pendingAskId: null,
    undoService,
  };
}
