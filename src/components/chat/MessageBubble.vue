<template>
  <div :class="['message', message.role]">
    <div class="message-header">
      <div class="header-left">
        <span class="message-role">{{ message.role === "user" ? "You" : "Agent" }}</span>
        <span v-if="isAssistant && message.duration != null" class="message-duration">{{
          formatDuration(message.duration)
        }}</span>
      </div>
      <span class="message-time">{{ formatTime(message.createdAt) }}</span>
    </div>

    <div class="message-content">
      <!-- User message: simple text rendering -->
      <template v-if="message.role !== 'assistant'">
        <template v-for="(seg, i) in message.segments" :key="i">
          <div v-if="seg.type === 'text'" class="markdown-body" v-html="renderMarkdown(seg.content)"></div>
        </template>
      </template>

      <!-- Assistant message: work process + result split -->
      <template v-else>
        <div v-if="hasWorkProcess" class="work-process">
          <div :class="['work-process-header', { collapsed: !workExpanded }]" @click="workExpanded = !workExpanded">
            <span class="work-toggle">{{ workExpanded ? "▾" : "▸" }}</span>
            <span class="work-label">Work Process</span>
            <span class="work-count">{{ stepCount }} {{ stepCount === 1 ? "step" : "steps" }}</span>
          </div>
          <div v-show="workExpanded" class="work-process-body">
            <template v-for="(seg, i) in workSegments" :key="i">
              <details v-if="seg.type === 'reasoning'" class="reasoning-block">
                <summary class="reasoning-header">
                  <span class="reasoning-dot"></span>
                  <span class="reasoning-label">Thinking</span>
                </summary>
                <div class="reasoning-body markdown-body" v-html="renderMarkdown(seg.content)"></div>
              </details>
              <div
                v-else-if="seg.type === 'text'"
                class="markdown-body work-text"
                v-html="renderMarkdown(seg.content)"
              ></div>
              <div v-else-if="seg.type === 'tool_call'" :class="['tool-call-item', seg.toolCall.status]">
                <details :open="seg.toolCall.status === 'error'">
                  <summary class="tool-header">
                    <span class="tool-status-dot" :data-status="seg.toolCall.status"></span>
                    <span class="tool-name">{{ seg.toolCall.name }}</span>
                    <span class="tool-status-label">{{ statusLabel(seg.toolCall.status) }}</span>
                    <span class="tool-args-preview">{{ formatArgs(seg.toolCall.args) }}</span>
                  </summary>
                  <div class="tool-body">
                    <div class="tool-section">
                      <span class="tool-label">Arguments</span>
                      <pre>{{ prettyArgs(seg.toolCall.args) }}</pre>
                    </div>
                    <div v-if="seg.toolCall.result" class="tool-section">
                      <span class="tool-label">Result</span>
                      <pre>{{ seg.toolCall.result }}</pre>
                    </div>
                    <div v-if="seg.toolCall.error" class="tool-section error-section">
                      <span class="tool-label">Error</span>
                      <pre class="tool-error-text">{{ seg.toolCall.error }}</pre>
                    </div>
                  </div>
                </details>
              </div>
            </template>
          </div>
        </div>

        <div v-if="hasResult" class="result-section">
          <template v-for="(seg, i) in resultSegments" :key="i">
            <div v-if="seg.type === 'text'" class="markdown-body" v-html="renderMarkdown(seg.content)"></div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { marked } from "marked";
import type { DisplayMessage, Segment } from "../../stores/chat";

marked.setOptions({ breaks: true, gfm: true });

const props = defineProps<{ message: DisplayMessage }>();
const workExpanded = ref(false);

const isAssistant = computed(() => props.message.role === "assistant");

function splitSegments(segments: Segment[]): { workSegments: Segment[]; resultSegments: Segment[] } {
  let splitIdx = segments.length;
  while (splitIdx > 0 && segments[splitIdx - 1].type === "text") {
    splitIdx--;
  }

  return {
    workSegments: segments.slice(0, splitIdx),
    resultSegments: segments.slice(splitIdx),
  };
}

const splitResult = computed(() => splitSegments(props.message.segments));

const workSegments = computed(() => splitResult.value.workSegments);
const resultSegments = computed(() => splitResult.value.resultSegments);
const hasWorkProcess = computed(() => workSegments.value.length > 0);
const hasResult = computed(() => resultSegments.value.length > 0);

const stepCount = computed(() => {
  return workSegments.value.filter((s) => s.type === "tool_call").length;
});

function renderMarkdown(text: string): string {
  if (!text) return "";
  return marked.parse(text) as string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusLabel(status: string): string {
  if (status === "running") return "Running";
  if (status === "done") return "Done";
  if (status === "error") return "Error";
  return status;
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
  border-radius: 8px;
  overflow: hidden;
}
.message.user {
  background: var(--chat-bubble-user);
  border-left: 3px solid var(--accent);
}
.message.assistant {
  background: var(--chat-bubble-assistant);
  border-left: 3px solid var(--text-muted);
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px;
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
.message-duration {
  font-size: 10px;
  color: var(--text-muted);
  font-family: "Consolas", "Courier New", monospace;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-tertiary);
}
.message-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: "Consolas", "Courier New", monospace;
}

.message-content {
  padding: 4px 16px 10px;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary);
}

/* Work Process Section */
.work-process {
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.work-process-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-primary));
}

.work-process-header:hover {
  background: var(--bg-hover);
}
.work-toggle {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.work-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.work-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
}
.work-process-body {
  padding: 8px 10px;
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-primary));
}
.work-text {
  margin: 4px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

/* Result Section */
.result-section {
  padding-top: 0;
}

/* Markdown content styles */
.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4) {
  color: var(--text-primary);
  margin: 12px 0 6px;
  line-height: 1.3;
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
.message-content :deep(h4) {
  font-size: 0.95em;
}
.message-content :deep(p) {
  margin: 4px 0;
}
.message-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.message-content :deep(a:hover) {
  opacity: 0.8;
}
.message-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 12px 0;
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
.message-content :deep(li) {
  margin: 2px 0;
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
  width: 100%;
}
.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.message-content :deep(th) {
  background: var(--bg-tertiary);
  font-weight: 600;
}
.message-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}
.message-content :deep(strong) {
  font-weight: 600;
}
.message-content :deep(em) {
  font-style: italic;
}

/* Reasoning/Thinking block */
.reasoning-block {
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
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
.reasoning-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.reasoning-body {
  padding: 8px 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
  font-size: 13px;
  line-height: 1.6;
}

/* Tool call cards */
.tool-call-item {
  margin: 8px 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
}
.tool-call-item.error {
  border-color: var(--danger);
}
.tool-call-item.done {
  border-color: var(--success);
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

.tool-name {
  font-weight: 600;
  color: var(--accent);
}
.tool-status-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
}
.tool-call-item.running .tool-status-label {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
}
.tool-call-item.done .tool-status-label {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 15%, transparent);
}
.tool-call-item.error .tool-status-label {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
}

.tool-args-preview {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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
.error-section {
  background: color-mix(in srgb, var(--danger) 6%, transparent);
  border-radius: 4px;
  padding: 8px;
}
.error-section .tool-label {
  color: var(--danger);
}

/* Responsive */
@media (max-width: 480px) {
  .message {
    margin-bottom: 10px;
    border-radius: 4px;
  }
  .message-header {
    padding: 6px 10px 4px;
  }
  .message-content {
    padding: 2px 10px 8px;
    font-size: 13px;
  }
  .tool-header {
    padding: 4px 8px;
  }
  .tool-body {
    padding: 6px 8px;
  }
}
</style>
