<template>
  <div class="message-list" ref="listRef">
    <div v-if="!convStore.selectedConversationId" class="welcome-screen">
      <h2>Coding Agent</h2>
      <p>Select a project and create a conversation to get started.</p>
    </div>
    <div v-else-if="!chatStore.hasMessages && !chatStore.isStreaming" class="welcome-screen">
      <h2>{{ convStore.selectedConversation?.title || "New Conversation" }}</h2>
      <p>Type a message to start working with your AI coding agent.</p>
    </div>
    <div v-else class="messages">
      <MessageBubble v-for="msg in chatStore.messages" :key="msg.id" :message="msg" />

      <div v-if="chatStore.isStreaming" class="message assistant streaming">
        <div class="message-role">Agent</div>
        <div class="message-content">
          <template v-for="(seg, i) in chatStore.streamingSegments" :key="i">
            <div v-if="seg.type === 'text'" class="markdown-body" v-html="renderMarkdown(seg.content)"></div>
            <div v-else-if="seg.type === 'tool_call'" :class="['inline-tool', seg.toolCall.status]">
              <div class="tool-header">
                <span class="tool-status-icon">{{
                  seg.toolCall.status === "running" ? "⏳" : seg.toolCall.status === "done" ? "✅" : "❌"
                }}</span>
                <span class="tool-name">{{ seg.toolCall.name }}</span>
              </div>
              <div v-if="seg.toolCall.status !== 'running'" class="tool-result">
                <pre>{{ seg.toolCall.error || seg.toolCall.result }}</pre>
              </div>
            </div>
          </template>
          <span class="cursor">|</span>
        </div>
      </div>

      <div v-if="chatStore.isCancelled" class="status-indicator cancelled">Conversation cancelled</div>
      <div v-if="chatStore.error" class="status-indicator error">Error: {{ chatStore.error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { marked } from "marked";
import { useConversationStore } from "../../stores/conversation";
import { useChatStore } from "../../stores/chat";
import MessageBubble from "./MessageBubble.vue";

marked.setOptions({ breaks: true, gfm: true });

const convStore = useConversationStore();
const chatStore = useChatStore();
const listRef = ref<HTMLElement | null>(null);

function renderMarkdown(text: string): string {
  if (!text) return "";
  return marked.parse(text) as string;
}

watch(
  () => [chatStore.messages.length, chatStore.streamingSegments.length, chatStore.isStreaming],
  async () => {
    await nextTick();
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
  },
  { deep: true }
);
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--text-muted);
}
.welcome-screen h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-secondary);
}
.welcome-screen p {
  font-size: 14px;
}
.messages {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}
.message {
  margin-bottom: 16px;
  padding: 10px 16px;
  border-radius: 8px;
}
.message.assistant {
  background: var(--chat-bubble-assistant);
}
.message-role {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.message-content {
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary);
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3) {
  color: var(--text-primary);
  margin: 12px 0 6px;
}
.message-content :deep(h1) {
  font-size: 1.4em;
}
.message-content :deep(h2) {
  font-size: 1.2em;
}
.message-content :deep(h3) {
  font-size: 1.05em;
}
.message-content :deep(p) {
  margin: 4px 0;
}
.message-content :deep(code) {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 13px;
}
.message-content :deep(pre) {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
}
.message-content :deep(pre code) {
  background: none;
  padding: 0;
  border: none;
}
.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: 20px;
  margin: 4px 0;
}
.message-content :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  color: var(--text-secondary);
  margin: 8px 0;
}
.message-content :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}
.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
}
.message-content :deep(th) {
  background: var(--bg-tertiary);
}

.inline-tool {
  margin: 10px 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
}
.inline-tool.running {
  border-color: var(--warning);
}
.inline-tool.done {
  border-color: var(--success);
}
.inline-tool.error {
  border-color: var(--danger);
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-secondary);
}
.tool-status-icon {
  font-size: 14px;
}
.tool-name {
  font-weight: 600;
  color: var(--accent);
}
.tool-result {
  padding: 8px 12px;
  background: var(--bg-primary);
}
.tool-result pre {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}

.cursor {
  animation: blink 1s step-end infinite;
  color: var(--accent);
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.status-indicator {
  text-align: center;
  padding: 12px;
  margin: 8px 0;
  font-size: 13px;
  border-radius: 6px;
}
.status-indicator.cancelled {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
}
.status-indicator.error {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}
</style>
