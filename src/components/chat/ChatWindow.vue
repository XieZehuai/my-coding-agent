<template>
  <div class="chat-window">
    <div v-if="convStore.selectedConversation" class="chat-header">
      <h2 class="chat-title">{{ convStore.selectedConversation.title }}</h2>
      <div class="header-actions">
        <button
          :class="['trust-toggle', { active: trustStore.isTrusted(convStore.selectedConversationId!) }]"
          @click="toggleTrust"
        >
          <span class="trust-dot" :data-active="trustStore.isTrusted(convStore.selectedConversationId!)"></span>
          {{ trustStore.isTrusted(convStore.selectedConversationId!) ? "Trust On" : "Trust Off" }}
        </button>
      </div>
    </div>
    <MessageList />
    <ResizeHandle
      axis="vertical"
      :active="inputResize.isDragging.value"
      @resize-start="inputResize.onPointerDown"
      @reset="layoutStore.inputHeight = 120"
    />
    <div class="input-wrapper" :style="{ height: layoutStore.inputHeight + 'px' }">
      <InputBox v-if="convStore.selectedConversation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConversationStore } from "../../stores/conversation";
import { useTrustModeStore } from "../../stores/trustMode";
import { useLayoutStore } from "../../stores/layout";
import { useResizable } from "../../composables/useResizable";
import MessageList from "./MessageList.vue";
import InputBox from "./InputBox.vue";
import ResizeHandle from "../layout/ResizeHandle.vue";

const convStore = useConversationStore();
const trustStore = useTrustModeStore();
const layoutStore = useLayoutStore();

const inputResize = useResizable({
  value: computed({
    get: () => layoutStore.inputHeight,
    set: (v) => {
      layoutStore.inputHeight = v;
    },
  }),
  min: 60,
  max: computed(() => Math.max(60, window.innerHeight * 0.5)),
  axis: "vertical",
});

function toggleTrust() {
  if (convStore.selectedConversationId) trustStore.toggle(convStore.selectedConversationId);
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--header-bg);
  min-height: 52px;
}
.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.trust-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.15s;
}
.trust-toggle:hover {
  background: var(--bg-hover);
}
.trust-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-muted);
  transition: background 0.15s;
}
.trust-toggle.active {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  border-color: var(--warning);
  color: var(--warning);
}
.trust-toggle.active .trust-dot {
  background: var(--warning);
}
.input-wrapper {
  flex-shrink: 0;
  min-height: 200px;
}
</style>
