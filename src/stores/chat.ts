import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Message, AgentState } from "@shared/types";

export interface AskInfo {
  askId: string;
  toolName: string;
  detail: string;
}

export interface ToolCallSegment {
  id: string;
  name: string;
  args: string;
  result?: string;
  error?: string;
  status: "running" | "done" | "error";
}

export interface ContentSegment {
  type: "text";
  content: string;
}

export interface ToolSegment {
  type: "tool_call";
  toolCall: ToolCallSegment;
}

export type Segment = ContentSegment | ToolSegment;

export interface DisplayMessage {
  id: string;
  convId: string;
  role: string;
  segments: Segment[];
  createdAt: number;
  reasoningContent?: string;
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref<DisplayMessage[]>([]);
  const state = ref<AgentState>("idle");
  const lastError = ref<string | null>(null);
  const streamingSegments = ref<Segment[]>([]);
  const streamingReasoning = ref("");
  const pendingAsk = ref<AskInfo | null>(null);
  const loadingMessages = ref(false);

  const hasMessages = computed(() => messages.value.length > 0);

  const isActive = computed(() =>
    ["streaming", "compressing", "executing_tools", "waiting_user"].includes(state.value)
  );

  function setMessages(msgs: DisplayMessage[]) {
    messages.value = msgs;
  }

  function addMessage(msg: DisplayMessage) {
    messages.value.push(msg);
  }

  function startStreaming() {
    state.value = "streaming";
    lastError.value = null;
    streamingSegments.value = [];
    streamingReasoning.value = "";
  }

  function appendReasoning(token: string) {
    streamingReasoning.value += token;
  }

  function appendToken(token: string) {
    const last = streamingSegments.value[streamingSegments.value.length - 1];
    if (last && last.type === "text") {
      last.content += token;
    } else {
      streamingSegments.value.push({ type: "text", content: token });
    }
  }

  function startToolCall(id: string, name: string, args: string) {
    streamingSegments.value.push({
      type: "tool_call",
      toolCall: { id, name, args, status: "running" },
    });
  }

  function endToolCall(id: string, result: string) {
    const seg = streamingSegments.value.find((s) => s.type === "tool_call" && s.toolCall.id === id);
    if (seg && seg.type === "tool_call") {
      seg.toolCall.result = result.length > 2000 ? result.substring(0, 2000) + "\n...(truncated)" : result;
      seg.toolCall.status = "done";
    }
  }

  function errorToolCall(id: string, error: string) {
    const seg = streamingSegments.value.find((s) => s.type === "tool_call" && s.toolCall.id === id);
    if (seg && seg.type === "tool_call") {
      seg.toolCall.error = error;
      seg.toolCall.status = "error";
    }
  }

  function finishStreaming() {
    const hasContent = streamingSegments.value.some((s) => (s.type === "text" ? s.content.length > 0 : true));

    if (hasContent) {
      messages.value.push({
        id: crypto.randomUUID(),
        convId: "",
        role: "assistant",
        segments: [...streamingSegments.value],
        createdAt: Date.now(),
        reasoningContent: streamingReasoning.value || undefined,
      });
    }
    state.value = "completed";
    streamingSegments.value = [];
    streamingReasoning.value = "";
  }

  function cancelStreaming() {
    state.value = "cancelled";
    streamingSegments.value = [];
  }

  function showAsk(ask: AskInfo) {
    pendingAsk.value = ask;
  }

  function clearAsk() {
    pendingAsk.value = null;
  }

  function setError(err: string) {
    state.value = "error";
    lastError.value = err;
  }

  function reset() {
    messages.value = [];
    state.value = "idle";
    lastError.value = null;
    streamingSegments.value = [];
    pendingAsk.value = null;
  }

  function mergeMessages(raw: Message[]): DisplayMessage[] {
    const result: DisplayMessage[] = [];
    const toolResults = new Map<string, string>();

    for (const msg of raw) {
      if (msg.role === "tool") {
        toolResults.set(msg.toolCallId || "", msg.content);
        continue;
      }

      if (msg.role === "assistant" && result.length > 0) {
        const last = result[result.length - 1];
        if (last.role === "assistant") {
          // Append text segment
          if (msg.content) {
            const lastSeg = last.segments[last.segments.length - 1];
            if (lastSeg && lastSeg.type === "text") {
              lastSeg.content += "\n\n" + msg.content;
            } else {
              last.segments.push({ type: "text", content: msg.content });
            }
          }
          // Append tool call segments
          if (msg.toolCalls) {
            for (const tc of msg.toolCalls) {
              const result = toolResults.get(tc.id);
              last.segments.push({
                type: "tool_call",
                toolCall: {
                  id: tc.id,
                  name: tc.function.name,
                  args: tc.function.arguments,
                  result: result || undefined,
                  status: "done",
                },
              });
            }
          }
          continue;
        }
      }

      // Start a new display message
      const segments: Segment[] = [];
      if (msg.content) {
        segments.push({ type: "text", content: msg.content });
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          const result = toolResults.get(tc.id);
          segments.push({
            type: "tool_call",
            toolCall: {
              id: tc.id,
              name: tc.function.name,
              args: tc.function.arguments,
              result: result || undefined,
              status: "done",
            },
          });
        }
      }

      result.push({
        id: msg.id,
        convId: msg.convId,
        role: msg.role,
        segments,
        createdAt: msg.createdAt,
        reasoningContent: msg.reasoningContent || undefined,
      });
    }

    return result;
  }

  async function loadMessages(convId: string) {
    loadingMessages.value = true;
    try {
      const raw = await window.api.getMessages(convId);
      messages.value = mergeMessages(raw);
    } finally {
      loadingMessages.value = false;
    }
  }

  return {
    messages,
    state,
    isActive,
    lastError,
    streamingSegments,
    streamingReasoning,
    pendingAsk,
    loadingMessages,
    hasMessages,
    setMessages,
    addMessage,
    startStreaming,
    appendReasoning,
    appendToken,
    startToolCall,
    endToolCall,
    errorToolCall,
    finishStreaming,
    cancelStreaming,
    showAsk,
    clearAsk,
    setError,
    reset,
    loadMessages,
  };
});
