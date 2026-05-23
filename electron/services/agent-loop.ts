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
import { AgentContext, buildAgentContext } from "./agent-context";
import {
  AgentRunOptions,
  TOKEN_LIMIT,
  COMPRESSION_THRESHOLD,
  convTrustMode,
  pendingConfirmations,
  convStatus,
} from "./agent-shared";

export type State =
  | "idle"
  | "streaming"
  | "compressing"
  | "executing_tools"
  | "waiting_user"
  | "completed"
  | "cancelled"
  | "error";

export class AgentLoop {
  private state: State = "idle";
  private ctx!: AgentContext;
  private client!: OpenAIClient;
  private config!: AppConfig;
  private options: AgentRunOptions;

  constructor(options: AgentRunOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    const { convId, projectPath, userContent, fileContents, customPrompt } = this.options;

    convTrustMode.set(convId, this.options.trustMode);

    this.config = readConfig(projectPath);
    this.client = new OpenAIClient();
    const undoService = new UndoService(convId, projectPath);

    const history = listMessages(convId);
    const messages = buildInitialMessages(userContent, history, projectPath, fileContents);

    const trackedSkills = skillTracker.get(convId);
    if (trackedSkills.length > 0) {
      for (const skill of [...trackedSkills].reverse()) {
        messages.unshift({ role: "system", content: skill.content });
      }
    }

    if (customPrompt) {
      messages.unshift({ role: "system", content: customPrompt });
    }

    this.ctx = buildAgentContext(this.options, undoService, this.config.maxTurns, messages, history);
    this.transition("streaming");

    while (!this.isTerminal) {
      await this.step();
    }
  }

  private async step(): Promise<void> {
    if (this.ctx.signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    try {
      switch (this.state) {
        case "streaming":
          return await this.doStreaming();
        case "compressing":
          return await this.doCompressing();
        case "executing_tools":
          return await this.doExecuteTools();
        case "waiting_user":
          return await this.doWaitUser();
      }
    } catch (e) {
      if (this.isCancelledError(e)) {
        emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
        return this.transition("cancelled");
      }
      const message = (e as Error).message || String(e);
      emitToRenderer(IPC.EVENT_ERROR, { convId: this.ctx.convId, error: message });
      return this.transition("error");
    }
  }

  //────────────────── state handlers ──────────────────

  private async doStreaming(): Promise<void> {
    if (countTokens(this.ctx.messages) > TOKEN_LIMIT * COMPRESSION_THRESHOLD) {
      return this.transition("compressing");
    }

    let content = "";
    let reasoningContent = "";
    let toolCalls: ToolCall[] = [];
    let streamError: Error | null = null;

    await this.client.chatStream(
      {
        baseUrl: this.config.api.baseUrl,
        apiKey: this.config.api.apiKey,
        model: this.config.api.model,
        messages: this.ctx.messages,
        tools: TOOL_DEFINITIONS,
        retry: this.config.api.retry,
        signal: this.ctx.signal,
      },
      {
        onToken: (token) => {
          content += token;
          emitToRenderer(IPC.EVENT_TOKEN, { convId: this.ctx.convId, token });
        },
        onReasoning: (token) => {
          reasoningContent += token;
          emitToRenderer(IPC.EVENT_REASONING, { convId: this.ctx.convId, token });
        },
        onToolCalls: (tcs) => {
          toolCalls = tcs;
        },
        onComplete: () => {},
        onError: (error) => {
          streamError = error;
          emitToRenderer(IPC.EVENT_ERROR, { convId: this.ctx.convId, error: error.message });
        },
      }
    );

    if (streamError) {
      if (this.isCancelledError(streamError)) {
        emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
        return this.transition("cancelled");
      }
      return this.transition("error");
    }

    if (this.ctx.signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    saveAssistantMessage(this.ctx.convId, content, toolCalls.length > 0 ? toolCalls : null, reasoningContent);

    this.ctx.messages.push({
      role: "assistant",
      content,
      reasoning_content: reasoningContent || undefined,
      tool_calls: toolCalls.length > 0 ? [...toolCalls] : undefined,
    });

    if (toolCalls.length === 0) {
      if (!hasAssistantResponse(this.ctx.history)) {
        this.generateTitle();
      }
      emitToRenderer(IPC.EVENT_COMPLETE, { convId: this.ctx.convId });
      return this.transition("completed");
    }

    this.ctx.pendingTools = [...toolCalls];
    return this.transition("executing_tools");
  }

  private async doCompressing(): Promise<void> {
    if (this.ctx.signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    const summary = await this.summarizeContext();

    if (this.ctx.signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    this.ctx.messages = compressContext(this.ctx.messages, summary);
    return this.transition("streaming");
  }

  private async doExecuteTools(): Promise<void> {
    const tool = this.ctx.pendingTools[0];
    if (!tool) {
      return this.nextRound();
    }

    if (this.ctx.signal.aborted) {
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    const toolName = tool.function.name;
    const tcId = tool.id;
    const parsed = parseToolArguments(tool.function.arguments);

    if (!parsed.ok) {
      this.ctx.pendingTools.shift();
      emitToRenderer(IPC.EVENT_TOOL_START, { convId: this.ctx.convId, toolName, toolCallId: tcId, args: {} });
      this.recordToolFailure(toolName, tcId, parsed.error);
      return;
    }

    const args = parsed.args;

    emitToRenderer(IPC.EVENT_TOOL_START, { convId: this.ctx.convId, toolName, toolCallId: tcId, args });

    const category = getPermissionCategory(toolName);
    const permission = convTrustMode.get(this.ctx.convId) ? "always" : this.config.permissions[category];

    if (permission === "deny") {
      this.ctx.pendingTools.shift();
      const errMsg = `Permission denied for ${toolName}`;
      emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId: this.ctx.convId, toolCallId: tcId, error: errMsg });
      saveToolMessage(this.ctx.convId, errMsg, tcId);
      this.ctx.messages.push({ role: "tool", content: errMsg, tool_call_id: tcId });
      return;
    }

    if (permission === "ask") {
      emitToRenderer(IPC.EVENT_ASK, {
        convId: this.ctx.convId,
        askId: tcId,
        toolName,
        detail: `Tool: ${toolName}\n${toolName === "write_file" ? `File: ${args.path}` : toolName === "run_command" ? `Command: ${args.command}` : JSON.stringify(args)}`,
      });

      this.ctx.pendingAskId = tcId;
      this.transition("waiting_user");
      return;
    }

    this.ctx.pendingTools.shift();
    await this.executeOneTool(toolName, args, tcId);
  }

  private async doWaitUser(): Promise<void> {
    const askId = this.ctx.pendingAskId!;
    const approved = await waitForConfirmation(askId, this.ctx.signal);

    if (this.ctx.signal.aborted) {
      this.ctx.pendingAskId = null;
      emitToRenderer(IPC.EVENT_CANCELLED, { convId: this.ctx.convId });
      return this.transition("cancelled");
    }

    const tool = this.ctx.pendingTools.shift();
    if (!tool) {
      this.ctx.pendingAskId = null;
      this.transition("executing_tools");
      return;
    }

    if (!approved) {
      const errMsg = `User denied permission for ${tool.function.name}`;
      emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId: this.ctx.convId, toolCallId: askId, error: errMsg });
      saveToolMessage(this.ctx.convId, errMsg, askId);
      this.ctx.messages.push({ role: "tool", content: errMsg, tool_call_id: askId });
    } else {
      const parsed = parseToolArguments(tool.function.arguments);
      if (!parsed.ok) {
        this.recordToolFailure(tool.function.name, tool.id, parsed.error);
        this.ctx.pendingAskId = null;
        return this.transition("executing_tools");
      }

      const args = parsed.args;
      await this.executeOneTool(tool.function.name, args, tool.id);
    }

    this.ctx.pendingAskId = null;
    this.transition("executing_tools");
  }

  //────────────────── helpers ──────────────────

  private async executeOneTool(toolName: string, args: Record<string, unknown>, tcId: string): Promise<void> {
    const startTime = Date.now();
    const result = await executeTool(toolName, args, this.ctx.projectPath, this.ctx.undoService.getBackupCallback());
    const messageContent = result.error || result.content;

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
    this.ctx.toolLogs.push(logEntry);

    if (result.error) {
      emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId: this.ctx.convId, toolCallId: tcId, error: result.error });
    } else {
      const displayContent =
        result.content.length > 5000
          ? result.content.substring(0, 5000) + `\n... (truncated, ${result.content.length} chars total)`
          : result.content;
      emitToRenderer(IPC.EVENT_TOOL_END, { convId: this.ctx.convId, toolCallId: tcId, result: displayContent });
    }

    saveToolMessage(this.ctx.convId, messageContent, tcId);
    this.ctx.messages.push({ role: "tool", content: messageContent, tool_call_id: tcId });
  }

  private recordToolFailure(toolName: string, tcId: string, error: string): void {
    const content = error;
    this.ctx.toolLogs.push({
      timestamp: Date.now(),
      toolName,
      target: "",
      duration: 0,
      status: "error",
      error,
    });

    emitToRenderer(IPC.EVENT_TOOL_ERROR, { convId: this.ctx.convId, toolCallId: tcId, error });
    saveToolMessage(this.ctx.convId, content, tcId);
    this.ctx.messages.push({ role: "tool", content, tool_call_id: tcId });
  }

  private nextRound(): void {
    this.ctx.round++;
    if (this.ctx.round > this.ctx.maxTurns) {
      emitToRenderer(IPC.EVENT_TOKEN, {
        convId: this.ctx.convId,
        token: `\n\n> ⚠️ 已达到最大对话轮次（${this.ctx.maxTurns}轮），对话自动结束。如需继续，请发送新消息。`,
      });
      emitToRenderer(IPC.EVENT_COMPLETE, { convId: this.ctx.convId });
      this.transition("completed");
    } else {
      this.transition("streaming");
    }
  }

  private async summarizeContext(): Promise<string> {
    try {
      const summaryMessages: ChatMessage[] = [
        {
          role: "system",
          content:
            "Summarize the following conversation. Include key decisions made, files modified, and remaining work. Keep technical details. Write in Chinese.",
        },
        ...this.ctx.messages.slice(1, -10),
        { role: "user", content: "请总结以上对话内容，包括已完成的修改和关键决策。" },
      ];

      const result = await this.client.chat({
        baseUrl: this.config.api.baseUrl,
        apiKey: this.config.api.apiKey,
        model: this.config.api.model,
        messages: summaryMessages,
        retry: 1,
        signal: this.ctx.signal,
      });

      return result.content || "(summary unavailable)";
    } catch (e) {
      if (this.isCancelledError(e)) {
        throw e;
      }
      return "(summary failed)";
    }
  }

  private isCancelledError(e: unknown): boolean {
    return this.ctx.signal.aborted || (e as Error).message === "Request cancelled";
  }

  private generateTitle(): void {
    const { convId } = this.ctx;
    const messages = this.ctx.messages;

    const run = async () => {
      try {
        const titleMessages: ChatMessage[] = [
          { role: "system", content: "请用15个字以内总结这段对话的核心主题。只返回标题文本，不要加引号或其他符号。" },
          ...messages.slice(-4),
        ];

        const result = await this.client.chat({
          baseUrl: this.config.api.baseUrl,
          apiKey: this.config.api.apiKey,
          model: this.config.api.model,
          messages: titleMessages,
          retry: 1,
          signal: new AbortController().signal,
        });

        const title = result.content?.trim().substring(0, 15) || "未命名";
        renameConversation(convId, title);
        emitToRenderer(IPC.EVENT_TITLE_GENERATED, { convId, title });
      } catch {
        // Title generation failure is non-critical
      }
    };

    run();
  }

  //────────────────── state machine core ──────────────────

  private transition(to: State): void {
    if (this.state === to) return;
    this.state = to;
    this.emitStatus();
  }

  private emitStatus(): void {
    const tokenCount = countTokens(this.ctx.messages);
    const snapshot = {
      convId: this.ctx.convId,
      state: this.state,
      round: this.ctx.round,
      maxTurns: this.ctx.maxTurns,
      tokenCount,
      tokenLimit: TOKEN_LIMIT,
      tokenPercent: Math.round((tokenCount / TOKEN_LIMIT) * 100),
      toolLogs: [...this.ctx.toolLogs],
      lastCompression: null,
    };
    convStatus.set(this.ctx.convId, snapshot);
    emitToRenderer(IPC.EVENT_STATUS, snapshot);
  }

  private get isTerminal(): boolean {
    return ["completed", "cancelled", "error"].includes(this.state);
  }
}

type ParsedToolArguments = { ok: true; args: Record<string, unknown> } | { ok: false; error: string };

function parseToolArguments(raw: string | undefined): ParsedToolArguments {
  try {
    return { ok: true, args: JSON.parse(raw || "{}") as Record<string, unknown> };
  } catch {
    return { ok: false, error: `Invalid tool arguments JSON: ${(raw || "").slice(0, 120)}` };
  }
}

function waitForConfirmation(askId: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    function finish(approved: boolean) {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      pendingConfirmations.delete(askId);
      resolve(approved);
    }

    function onAbort() {
      finish(false);
    }

    pendingConfirmations.set(askId, { resolve: finish });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
