<template>
  <div :class="['message', message.role]">
    <div class="message-role">{{ message.role === "user" ? "You" : "Agent" }}</div>
    <div class="message-content">
      <template v-for="(seg, i) in message.segments" :key="i">
        <div v-if="seg.type === 'text'" class="markdown-body" v-html="renderMarkdown(seg.content)"></div>
        <div v-else-if="seg.type === 'tool_call'" class="tool-call-item">
          <details>
            <summary class="tool-header">
              <span class="tool-icon">&#9881;</span>
              <span class="tool-name">{{ seg.toolCall.name }}</span>
              <span class="tool-args-preview">{{ formatArgs(seg.toolCall.args) }}</span>
            </summary>
            <div class="tool-body">
              <div class="tool-section">
                <span class="tool-label">Arguments:</span>
                <pre>{{ prettyArgs(seg.toolCall.args) }}</pre>
              </div>
              <div v-if="seg.toolCall.result" class="tool-section">
                <span class="tool-label">Result:</span>
                <pre>{{ seg.toolCall.result }}</pre>
              </div>
              <div v-if="seg.toolCall.error" class="tool-section">
                <span class="tool-label">Error:</span>
                <pre class="tool-error-text">{{ seg.toolCall.error }}</pre>
              </div>
            </div>
          </details>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from "marked";
import type { DisplayMessage } from "../../stores/chat";

marked.setOptions({ breaks: true, gfm: true });
const props = defineProps<{ message: DisplayMessage }>();

function renderMarkdown(text: string): string {
  if (!text) return "";
  return marked.parse(text) as string;
}
function prettyArgs(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    return args;
  }
}
function formatArgs(args: string): string {
  try {
    const p = JSON.parse(args);
    const s = JSON.stringify(p);
    return s.length > 60 ? s.substring(0, 60) + "..." : s;
  } catch {
    return args.substring(0, 60);
  }
}
</script>

<style scoped>
.message {
  margin-bottom: 16px;
  padding: 10px 16px;
  border-radius: 8px;
}
.message.user {
  background: var(--chat-bubble-user);
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
.message-content :deep(h3),
.message-content :deep(h4) {
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

.tool-call-item {
  margin: 6px 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  list-style: none;
}
.tool-header::-webkit-details-marker {
  display: none;
}
.tool-header:hover {
  background: var(--bg-hover);
}
.tool-icon {
  font-size: 14px;
}
.tool-name {
  font-weight: 600;
  color: var(--accent);
}
.tool-args-preview {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-body {
  padding: 8px 12px;
  background: var(--bg-primary);
}
.tool-section {
  margin-bottom: 8px;
}
.tool-section:last-child {
  margin-bottom: 0;
}
.tool-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  display: block;
  margin-bottom: 4px;
}
.tool-body pre {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-secondary);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
}
.tool-error-text {
  color: var(--danger);
}
</style>
