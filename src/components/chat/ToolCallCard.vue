<template>
  <details class="tool-call-card">
    <summary class="tool-header">
      <span class="tool-icon"></span>
      <span class="tool-name">{{ toolCall.function.name }}</span>
      <span class="tool-args">{{ truncatedArgs }}</span>
    </summary>
    <div class="tool-body">
      <pre class="tool-args-full">{{ prettyArgs }}</pre>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ToolCall } from "../../types/message";

const props = defineProps<{ toolCall: ToolCall }>();

const prettyArgs = computed(() => {
  try {
    const parsed = JSON.parse(props.toolCall.function.arguments || "{}");
    return JSON.stringify(parsed, null, 2);
  } catch {
    return props.toolCall.function.arguments;
  }
});

const truncatedArgs = computed(() => {
  const s = props.toolCall.function.arguments;
  if (s.length > 80) return s.substring(0, 80) + "...";
  return s;
});
</script>

<style scoped>
.tool-call-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-top: 8px;
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  list-style: none;
}

.tool-header::-webkit-details-marker {
  display: none;
}

.tool-header:hover {
  background: var(--bg-hover);
}

.tool-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.tool-name {
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.tool-args {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 12px;
}

.tool-body {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
}

.tool-args-full {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
