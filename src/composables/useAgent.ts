import { useChatStore } from '../stores/chat'
import { useConversationStore } from '../stores/conversation'
import { useTrustModeStore } from '../stores/trustMode'
import { useProjectStore } from '../stores/project'

export function useAgent() {
  const chatStore = useChatStore()
  const convStore = useConversationStore()
  const trustStore = useTrustModeStore()
  const projectStore = useProjectStore()

  function setupListeners(convId: string) {
    window.api.onToken((data) => {
      if (data.convId === convId) {
        chatStore.appendToken(data.token)
      }
    })

    window.api.onToolStart((data) => {
      if (data.convId === convId) {
        chatStore.startToolCall(
          data.toolCallId,
          data.toolName,
          JSON.stringify(data.args)
        )
      }
    })

    window.api.onToolEnd((data) => {
      if (data.convId === convId) {
        chatStore.endToolCall(data.toolCallId, data.result)
      }
    })

    window.api.onToolError((data) => {
      if (data.convId === convId) {
        chatStore.errorToolCall(data.toolCallId, data.error)
      }
    })

    window.api.onAsk((data) => {
      if (data.convId === convId) {
        chatStore.showAsk({
          askId: data.askId,
          toolName: data.toolName,
          detail: data.detail,
        })
      }
    })

    window.api.onComplete((data) => {
      if (data.convId === convId) {
        chatStore.finishStreaming()
      }
    })

    window.api.onCancelled((data) => {
      if (data.convId === convId) {
        chatStore.cancelStreaming()
      }
    })

    window.api.onError((data) => {
      if (data.convId === convId) {
        chatStore.setError(data.error)
      }
    })

    window.api.onTitleGenerated((data) => {
      if (data.convId === convId) {
        convStore.updateTitle(data.convId, data.title)
      }
    })
  }

  async function sendMessage(convId: string, content: string) {
    chatStore.startStreaming()
    return window.api.sendMessage(convId, content, trustStore.isTrusted(convId))
  }

  async function cancelMessage(convId: string) {
    return window.api.cancelMessage(convId)
  }

  async function confirmAsk(askId: string, approved: boolean) {
    chatStore.clearAsk()
    return window.api.confirmAsk(askId, approved)
  }

  return {
    setupListeners,
    sendMessage,
    cancelMessage,
    confirmAsk,
  }
}
