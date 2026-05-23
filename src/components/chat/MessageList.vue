<template>
  <div class="message-list" ref="listRef">
    <div v-if="!convStore.selectedConversationId" class="welcome-screen">
      <h2>Coding Agent</h2>
      <p>Select a project and create a conversation to get started.</p>
    </div>
    <div v-else-if="!chatStore.hasMessages && !chatStore.isActive" class="welcome-screen">
      <h2>{{ convStore.selectedConversation?.title || "New Conversation" }}</h2>
      <p>Type a message to start working with your AI coding agent.</p>
    </div>
    <div v-else class="messages">
      <MessageBubble v-for="msg in chatStore.messages" :key="msg.id" :message="msg" />

      <div v-if="chatStore.isActive" class="message assistant streaming-panel">
        <div class="message-header">
          <div class="header-left">
            <span class="message-role">Agent</span>
            <span class="message-live-badge">Streaming</span>
            <span class="message-live-timer">{{ elapsedTime }}</span>
          </div>
        </div>
        <div class="message-content">
          <div
            v-if="chatStore.streamingSegments.length === 0"
            class="waiting-indicator"
          >
            <span class="waiting-dots"
              ><span class="dot"></span><span class="dot"></span><span class="dot"></span
            ></span>
            <span class="waiting-text">Waiting for response</span>
          </div>
          <template v-for="(seg, i) in chatStore.streamingSegments" :key="i">
            <details v-if="seg.type === 'reasoning'" class="reasoning-block streaming" open>
              <summary class="reasoning-header">
                <span class="reasoning-dot"></span>
                <span class="reasoning-label">Thinking</span>
                <span class="reasoning-live-badge">live</span>
              </summary>
              <div class="reasoning-body markdown-body" v-html="renderMarkdown(seg.content)"></div>
            </details>
            <div v-else-if="seg.type === 'text'" class="markdown-body" v-html="renderMarkdown(seg.content)"></div>
            <div v-else-if="seg.type === 'tool_call'" :class="['inline-tool', seg.toolCall.status]">
              <div class="tool-header">
                <span class="tool-status-dot" :data-status="seg.toolCall.status"></span>
                <span class="tool-name">{{ seg.toolCall.name }}</span>
                <span class="tool-status-label">{{ statusLabel(seg.toolCall.status) }}</span>
              </div>
              <div v-if="seg.toolCall.status !== 'running'" class="tool-result">
                <pre>{{ seg.toolCall.error || seg.toolCall.result }}</pre>
              </div>
            </div>
          </template>
          <span v-if="hasTextStream" class="cursor">|</span>
        </div>
      </div>

      <div v-if="chatStore.state === 'cancelled'" class="status-indicator cancelled">Conversation cancelled</div>
      <div v-if="chatStore.state === 'error'" class="status-indicator error">Error: {{ chatStore.lastError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from "vue";
import { marked } from "marked";
import { useConversationStore } from "../../stores/conversation";
import { useChatStore } from "../../stores/chat";
import MessageBubble from "./MessageBubble.vue";

marked.setOptions({ breaks: true, gfm: true });

const convStore = useConversationStore();
const chatStore = useChatStore();
const listRef = ref<HTMLElement | null>(null);

const elapsedTime = ref("0s");
let timerInterval: ReturnType<typeof setInterval> | null = null;

function updateElapsed() {
  if (chatStore.responseStartTime != null) {
    const ms = Date.now() - chatStore.responseStartTime;
    if (ms < 1000) elapsedTime.value = `${ms}ms`;
    else elapsedTime.value = `${(ms / 1000).toFixed(1)}s`;
  }
}

watch(
  () => chatStore.isActive,
  (active) => {
    if (active) {
      elapsedTime.value = "0s";
      timerInterval = setInterval(updateElapsed, 100);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }
);

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval);
});

const hasTextStream = computed(() =>
  chatStore.streamingSegments.some((s) => s.type === "text" && s.content.length > 0)
);

function renderMarkdown(text: string): string {
  if (!text) return "";
  return marked.parse(text) as string;
}

function statusLabel(status: string): string {
  if (status === "running") return "Running";
  if (status === "done") return "Done";
  if (status === "error") return "Error";
  return status;
}

watch(
  () => [chatStore.messages.length, chatStore.streamingSegments.length, chatStore.isActive],
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
.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.message-role {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.message-live-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--success);
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--success) 15%, transparent);
  animation: pulse-badge 1.5s ease-in-out infinite;
}
.message-live-timer {
  font-size: 10px;
  color: var(--text-muted);
  font-family: "Consolas", "Courier New", monospace;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-tertiary);
}
@keyframes pulse-badge {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
.message-content {
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary);
}

/* Waiting indicator */
.waiting-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.waiting-dots {
  display: flex;
  gap: 4px;
}
.waiting-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}
.waiting-dots .dot:nth-child(1) {
  animation: wave-dot 1.4s ease-in-out infinite;
}
.waiting-dots .dot:nth-child(2) {
  animation: wave-dot 1.4s ease-in-out 0.2s infinite;
}
.waiting-dots .dot:nth-child(3) {
  animation: wave-dot 1.4s ease-in-out 0.4s infinite;
}
@keyframes wave-dot {
  0%,
  80%,
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
.waiting-text {
  font-size: 13px;
  color: var(--text-muted);
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
.tool-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tool-status-dot[data-status="running"] {
  background: var(--warning);
  animation: pulse-dot 1.2s ease-in-out infinite;
}
.tool-status-dot[data-status="done"] {
  background: var(--success);
}
.tool-status-dot[data-status="error"] {
  background: var(--danger);
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.tool-status-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
}
.inline-tool.running .tool-status-label {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
}
.inline-tool.done .tool-status-label {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 15%, transparent);
}
.inline-tool.error .tool-status-label {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
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

/* Reasoning / Thinking block */
.reasoning-block {
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
}
.reasoning-block.streaming {
  border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
}
.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  background: var(--bg-secondary);
  color: var(--text-muted);
  list-style: none;
  user-select: none;
}
.reasoning-header::-webkit-details-marker {
  display: none;
}
.reasoning-header:hover {
  background: var(--bg-hover);
}
.reasoning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
  flex-shrink: 0;
}
.reasoning-block.streaming .reasoning-dot {
  animation: pulse-dot 1.2s ease-in-out infinite;
}
.reasoning-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.reasoning-live-badge {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--warning);
  margin-left: auto;
  animation: pulse-badge 1.5s ease-in-out infinite;
}
.reasoning-body {
  padding: 8px 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
  font-size: 13px;
  line-height: 1.6;
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
