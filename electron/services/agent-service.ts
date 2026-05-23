import { OpenAIClient, ChatMessage } from "../api/openai-client";
import { TOOL_DEFINITIONS, executeTool, getPermissionCategory } from "../tools/registry";
import { ToolCall, AppConfig, ToolLogEntry, IPC } from "../../shared/types";
import { buildInitialMessages, countTokens, compressContext, hasAssistantResponse } from "../utils/context-builder";
import { listMessages, saveAssistantMessage, saveToolMessage } from "../db/messages";
import { renameConversation } from "../db/conversations";
import { emitToRenderer } from "../ipc/handlers";
import { readConfig } from "../utils/config";
import { UndoService } from "./undo-service";
import { skillTracker } from "./skill-tracker";

const TOKEN_LIMIT = 120000;
const COMPRESSION_THRESHOLD = 0.9;

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

interface AgentRunState {
  round: number;
  toolLogs: ToolLogEntry[];
}

const convTrustMode = new Map<string, boolean>();

interface AgentStatusSnapshot {
  state: string;
  round: number;
  maxTurns: number;
  tokenCount: number;
  tokenLimit: number;
  tokenPercent: number;
  toolLogs: ToolLogEntry[];
  lastCompression: number | null;
}

const convStatus = new Map<string, AgentStatusSnapshot>();

export function getAgentStatus(convId: string): AgentStatusSnapshot {
  return (
    convStatus.get(convId) || {
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

export async function runAgentLoop(options: AgentRunOptions): Promise<void> {
  const { convId, projectPath, userContent, fileContents, signal, customPrompt } = options;

  convTrustMode.set(convId, options.trustMode);

  const config = readConfig(projectPath);
  const maxTurns = config.maxTurns;
  const client = new OpenAIClient();
  const state: AgentRunState = { round: 0, toolLogs: [] };
  const undoService = new UndoService(convId, projectPath);

  const history = listMessages(convId);
  let messages = buildInitialMessages(userContent, history, projectPath, fileContents);

  // Inject tracked skill contents as system instructions (before custom command prompt)
  const trackedSkills = skillTracker.get(convId);
  if (trackedSkills.length > 0) {
    for (const skill of [...trackedSkills].reverse()) {
      messages.unshift({ role: "system", content: skill.content });
    }
  }

  // Inject custom command prompt as system instruction
  if (customPrompt) {
    messages.unshift({ role: "system", content: customPrompt });
  }

  for (state.round = 1; state.round <= maxTurns; state.round++) {
    if (signal.aborted) {
      convStatus.delete(convId);
      emitToRenderer(IPC.EVENT_CANCELLED, { convId });
      return;
    }

    emitStatus(convId, "streaming", messages, state, maxTurns);

    if (countTokens(messages) > TOKEN_LIMIT * COMPRESSION_THRESHOLD) {
      emitStatus(convId, "compressing", messages, state, maxTurns);
      const summary = await summarizeContext(client, config, messages, signal);
      messages = compressContext(messages, summary);
    }

    let content = "";
    let reasoningContent = "";
    let toolCalls: ToolCall[] = [];

    try {
      await client.chatStream(
        {
          baseUrl: config.api.baseUrl,
          apiKey: config.api.apiKey,
          model: config.api.model,
          messages,
          tools: TOOL_DEFINITIONS,
          retry: config.api.retry,
          signal,
        },
        {
          onToken: (token) => {
            content += token;
            emitToRenderer(IPC.EVENT_TOKEN, { convId, token });
          },
          onReasoning: (token) => {
            reasoningContent += token;
          },
          onToolCalls: (tcs) => {
            toolCalls = tcs;
          },
          onComplete: () => {},
          onError: (error) => {
            emitToRenderer(IPC.EVENT_ERROR, { convId, error: error.message });
          },
        },
      );
    } catch (e) {
      if ((e as Error).message === "Request cancelled") {
        emitToRenderer(IPC.EVENT_CANCELLED, { convId });
        return;
      }
      emitToRenderer(IPC.EVENT_ERROR, { convId, error: (e as Error).message });
      return;
    }

    saveAssistantMessage(convId, content, toolCalls.length > 0 ? toolCalls : null, reasoningContent);

    messages.push({
      role: "assistant",
      content,
      reasoning_content: reasoningContent || undefined,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    if (toolCalls.length === 0) {
      if (!hasAssistantResponse(history)) {
        generateTitle(client, config, convId, messages, signal);
      }
      emitToRenderer(IPC.EVENT_COMPLETE, { convId });
      return;
    }

    await executeToolCalls(config, messages, toolCalls, state, convId, projectPath, undoService, signal);
  }

  emitToRenderer(IPC.EVENT_TOKEN, {
    convId,
    token: `\n\n> ⚠️ 已达到最大对话轮次（${maxTurns}轮），对话自动结束。如需继续，请发送新消息。`,
  });
  emitToRenderer(IPC.EVENT_COMPLETE, { convId });
}

const pendingConfirmations = new Map<string, { resolve: (approved: boolean) => void }>();

export function resolveConfirmation(askId: string, approved: boolean) {
  const pending = pendingConfirmations.get(askId);
  if (pending) {
    pending.resolve(approved);
    pendingConfirmations.delete(askId);
  }
}

async function executeToolCalls(
  config: AppConfig,
  messages: ChatMessage[],
  toolCalls: ToolCall[],
  state: AgentRunState,
  convId: string,
  projectPath: string,
  undoService: UndoService,
  signal: AbortSignal,
) {
  for (const tc of toolCalls) {
    if (signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId });
      return;
    }

    const toolName = tc.function.name;
    const args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
    const askId = tc.id;

    emitToRenderer(IPC.EVENT_TOOL_START, { convId, toolName, toolCallId: tc.id, args });

    const category = getPermissionCategory(toolName);
    const permission = convTrustMode.get(convId) ? "always" : config.permissions[category];

    if (permission === "deny") {
      const errMsg = `Permission denied for ${toolName}`;
      emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId, toolCallId: tc.id, error: errMsg });
      saveToolMessage(convId, errMsg, tc.id);
      messages.push({ role: "tool", content: errMsg, tool_call_id: tc.id });
      continue;
    }

    if (permission === "ask") {
      emitToRenderer(IPC.EVENT_ASK, {
        convId,
        askId,
        toolName,
        detail: `Tool: ${toolName}\n${toolName === "write_file" ? `File: ${args.path}` : toolName === "run_command" ? `Command: ${args.command}` : JSON.stringify(args)}`,
      });

      const approved = await waitForConfirmation(askId, signal);
      if (!approved) {
        const errMsg = `User denied permission for ${toolName}`;
        emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId, toolCallId: tc.id, error: errMsg });
        saveToolMessage(convId, errMsg, tc.id);
        messages.push({ role: "tool", content: errMsg, tool_call_id: tc.id });
        continue;
      }
    }

    const startTime = Date.now();
    const result = await executeTool(toolName, args, projectPath, undoService.getBackupCallback());

    const duration = Date.now() - startTime;
    const logEntry: ToolLogEntry = {
      timestamp: Date.now(),
      toolName,
      target:
        toolName === "write_file"
          ? String(args.path || "")
          : toolName === "run_command"
            ? String(args.command || "")
            : String(args.path || args.pattern || ""),
      duration,
      status: result.error ? "error" : "success",
      error: result.error,
    };
    state.toolLogs.push(logEntry);

    if (result.error) {
      emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId, toolCallId: tc.id, error: result.error });
    } else {
      const displayContent =
        result.content.length > 5000
          ? result.content.substring(0, 5000) + `\n... (truncated, ${result.content.length} chars total)`
          : result.content;
      emitToRenderer(IPC.EVENT_TOOL_END, { convId, toolCallId: tc.id, result: displayContent });
    }

    saveToolMessage(convId, result.content, tc.id);
    messages.push({ role: "tool", content: result.content, tool_call_id: tc.id });
  }
}

function waitForConfirmation(askId: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConfirmations.set(askId, { resolve });

    const onAbort = () => {
      pendingConfirmations.delete(askId);
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function summarizeContext(
  client: OpenAIClient,
  config: AppConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  try {
    const summaryMessages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Summarize the following conversation. Include key decisions made, files modified, and remaining work. Keep technical details. Write in Chinese.",
      },
      ...messages.slice(1, -10),
      { role: "user", content: "请总结以上对话内容，包括已完成的修改和关键决策。" },
    ];

    const result = await client.chat({
      baseUrl: config.api.baseUrl,
      apiKey: config.api.apiKey,
      model: config.api.model,
      messages: summaryMessages,
      retry: 1,
      signal,
    });

    return result.content || "(summary unavailable)";
  } catch {
    return "(summary failed)";
  }
}

async function generateTitle(
  client: OpenAIClient,
  config: AppConfig,
  convId: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<void> {
  try {
    const titleMessages: ChatMessage[] = [
      { role: "system", content: "请用15个字以内总结这段对话的核心主题。只返回标题文本，不要加引号或其他符号。" },
      ...messages.slice(-4),
    ];

    const result = await client.chat({
      baseUrl: config.api.baseUrl,
      apiKey: config.api.apiKey,
      model: config.api.model,
      messages: titleMessages,
      retry: 1,
      signal,
    });

    const title = result.content?.trim().substring(0, 15) || "未命名";
    renameConversation(convId, title);
    emitToRenderer(IPC.EVENT_TITLE_GENERATED, { convId, title });
  } catch {
    // Title generation failure is non-critical
  }
}

function emitStatus(
  convId: string,
  state: string,
  messages: ChatMessage[],
  agentState: AgentRunState,
  maxTurns: number,
) {
  const tokenCount = countTokens(messages);
  const snapshot: AgentStatusSnapshot = {
    state,
    round: agentState.round,
    maxTurns,
    tokenCount,
    tokenLimit: TOKEN_LIMIT,
    tokenPercent: Math.round((tokenCount / TOKEN_LIMIT) * 100),
    toolLogs: [...agentState.toolLogs],
    lastCompression: null,
  };
  convStatus.set(convId, snapshot);
  emitToRenderer(IPC.EVENT_STATUS, snapshot);
}
