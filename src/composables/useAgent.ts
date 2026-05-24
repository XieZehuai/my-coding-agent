import { useChatStore } from "../stores/chat";
import { useConversationStore } from "../stores/conversation";
import { useTrustModeStore } from "../stores/trustMode";
import { useProjectStore } from "../stores/project";
import { IPC } from "@shared/types";

// Module-level flag: title-generated is a global event and must be registered
// exactly once across the app's lifetime, regardless of how many times
// useAgent() is called.
let titleListenerRegistered = false;

export function useAgent() {
  const chatStore = useChatStore();
  const convStore = useConversationStore();
  const trustStore = useTrustModeStore();
  const projectStore = useProjectStore();

  // Per-conversation streaming events: re-bound on every conversation switch
  // via removeAllListeners + new closure capturing the active convId.
  const eventChannels = [
    IPC.EVENT_TOKEN,
    IPC.EVENT_REASONING,
    IPC.EVENT_TOOL_START,
    IPC.EVENT_TOOL_END,
    IPC.EVENT_TOOL_ERROR,
    IPC.EVENT_ASK,
    IPC.EVENT_COMPLETE,
    IPC.EVENT_CANCELLED,
    IPC.EVENT_ERROR,
  ];

  function teardownListeners() {
    for (const channel of eventChannels) {
      window.api.removeAllListeners(channel);
    }
  }

  // Global, conversation-agnostic listener.
  // Title generation runs asynchronously in the main process and may complete
  // after the user has switched away from the originating conversation; binding
  // it per-conversation would lose those events. updateTitle(id, ...) already
  // looks up by id, so no convId filtering is needed here.
  function ensureGlobalListeners() {
    if (titleListenerRegistered) return;
    titleListenerRegistered = true;
    window.api.onTitleGenerated((data) => {
      convStore.updateTitle(data.convId, data.title);
    });
  }

  function setupListeners(convId: string) {
    teardownListeners();
    ensureGlobalListeners();
    window.api.onToken((data) => {
      if (data.convId === convId) {
        chatStore.appendToken(data.token);
      }
    });

    window.api.onReasoning((data) => {
      if (data.convId === convId) {
        chatStore.appendReasoning(data.token);
      }
    });

    window.api.onToolStart((data) => {
      if (data.convId === convId) {
        chatStore.startToolCall(data.toolCallId, data.toolName, JSON.stringify(data.args));
      }
    });

    window.api.onToolEnd((data) => {
      if (data.convId === convId) {
        chatStore.endToolCall(data.toolCallId, data.result);
      }
    });

    window.api.onToolError((data) => {
      if (data.convId === convId) {
        chatStore.errorToolCall(data.toolCallId, data.error);
      }
    });

    window.api.onAsk((data) => {
      if (data.convId === convId) {
        chatStore.showAsk({
          askId: data.askId,
          toolName: data.toolName,
          detail: data.detail,
        });
      }
    });

    window.api.onComplete((data) => {
      if (data.convId === convId) {
        chatStore.finishStreaming();
      }
    });

    window.api.onCancelled((data) => {
      if (data.convId === convId) {
        chatStore.cancelStreaming();
      }
    });

    window.api.onError((data) => {
      if (data.convId === convId) {
        chatStore.setError(data.error);
      }
    });
  }

  async function sendMessage(convId: string, content: string) {
    chatStore.startStreaming();
    return window.api.sendMessage(convId, content, trustStore.isTrusted(convId));
  }

  async function cancelMessage(convId: string) {
    return window.api.cancelMessage(convId);
  }

  async function confirmAsk(askId: string, approved: boolean) {
    chatStore.clearAsk();
    return window.api.confirmAsk(askId, approved);
  }

  return {
    setupListeners,
    sendMessage,
    cancelMessage,
    confirmAsk,
  };
}
