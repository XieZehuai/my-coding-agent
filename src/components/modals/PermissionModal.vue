<template>
  <Teleport to="body">
    <div v-if="chatStore.pendingAsk" class="modal-overlay">
      <div class="modal-content">
        <h3>Permission Required</h3>
        <p class="modal-tool">{{ chatStore.pendingAsk.toolName }}</p>
        <pre class="modal-detail">{{ chatStore.pendingAsk.detail }}</pre>
        <div class="modal-actions">
          <button class="btn-deny" @click="handleDeny">Deny</button>
          <button class="btn-allow-all" @click="handleAllowAll">Allow All This Turn</button>
          <button class="btn-allow" @click="handleAllow">Allow</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useChatStore } from "../../stores/chat";
import { useConversationStore } from "../../stores/conversation";
import { useTrustModeStore } from "../../stores/trustMode";
import { useAgent } from "../../composables/useAgent";

const chatStore = useChatStore();
const convStore = useConversationStore();
const trustStore = useTrustModeStore();
const { confirmAsk } = useAgent();

function handleAllow() {
  if (chatStore.pendingAsk) confirmAsk(chatStore.pendingAsk.convId, chatStore.pendingAsk.askId, true);
}
function handleAllowAll() {
  if (chatStore.pendingAsk) {
    if (convStore.selectedConversationId) trustStore.setTrusted(convStore.selectedConversationId, true);
    confirmAsk(chatStore.pendingAsk.convId, chatStore.pendingAsk.askId, true);
  }
}
function handleDeny() {
  if (chatStore.pendingAsk) confirmAsk(chatStore.pendingAsk.convId, chatStore.pendingAsk.askId, false);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: var(--shadow);
}
.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--warning);
  margin-bottom: 8px;
}
.modal-tool {
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 12px;
}
.modal-detail {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 20px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-allow {
  background: var(--success);
  color: #fff;
}
.btn-allow:hover {
  background: var(--success-hover);
}
.btn-allow-all {
  background: var(--accent);
  color: var(--accent-text);
}
.btn-allow-all:hover {
  background: var(--accent-hover);
}
.btn-deny {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn-deny:hover {
  background: var(--bg-hover);
}
</style>
