<template>
  <div
    class="dev-panel"
    :style="{
      width: layoutStore.devPanelVisible ? layoutStore.devPanelWidth + 'px' : '0px',
    }"
  >
    <ResizeHandle
      axis="horizontal"
      :active="devPanelResize.isDragging.value"
      @resize-start="devPanelResize.onPointerDown"
      @reset="layoutStore.devPanelWidth = 280"
    />
    <div class="panel-inner">
      <div class="panel-header">
        <span>Developer Panel</span>
        <button class="close-btn" @click="layoutStore.devPanelVisible = false">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <h4>Token Usage</h4>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: status.tokenPercent + '%' }"
              :class="{ warning: status.tokenPercent > 80, danger: status.tokenPercent > 95 }"
            ></div>
          </div>
          <span class="stat">{{ status.tokenCount }} / {{ status.tokenLimit }} ({{ status.tokenPercent }}%)</span>
        </div>
        <div class="panel-section">
          <h4>Agent State</h4>
          <div class="stat-row">
            <span>State:</span><span class="stat-value">{{ status.state }}</span>
          </div>
          <div class="stat-row">
            <span>Round:</span><span class="stat-value">{{ status.round }} / {{ status.maxTurns }}</span>
          </div>
        </div>
        <div class="panel-section">
          <h4>Tool Log</h4>
          <div v-if="status.toolLogs && status.toolLogs.length > 0" class="tool-log">
            <div v-for="(log, i) in status.toolLogs" :key="i" :class="['log-entry', log.status]">
              <span class="log-tool">{{ log.toolName }}</span
              ><span class="log-target">{{ log.target.substring(0, 40) }}</span>
              <span class="log-duration">{{ log.duration }}ms</span
              ><span v-if="log.error" class="log-error">{{ log.error }}</span>
            </div>
          </div>
          <div v-else class="stat">No tool executions yet</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useLayoutStore } from "../../stores/layout";
import { useResizable } from "../../composables/useResizable";
import ResizeHandle from "../layout/ResizeHandle.vue";

interface DevStatus {
  convId: string;
  state: string;
  round: number;
  maxTurns: number;
  tokenCount: number;
  tokenLimit: number;
  tokenPercent: number;
  toolLogs: Array<{ toolName: string; target: string; duration: number; status: string; error?: string }>;
  lastCompression: number | null;
}

const layoutStore = useLayoutStore();

const status = ref<DevStatus>({
  convId: "",
  state: "idle",
  round: 0,
  maxTurns: 50,
  tokenCount: 0,
  tokenLimit: 120000,
  tokenPercent: 0,
  toolLogs: [],
  lastCompression: null,
});

const devPanelResize = useResizable({
  value: computed({
    get: () => layoutStore.devPanelWidth,
    set: (v) => {
      layoutStore.devPanelWidth = v;
    },
  }),
  min: 200,
  max: computed(() => Math.max(200, window.innerWidth * 0.4)),
  axis: "horizontal",
  invert: true,
});

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === "d") {
    e.preventDefault();
    layoutStore.devPanelVisible = !layoutStore.devPanelVisible;
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  window.api.onStatus((data) => {
    status.value = data as DevStatus;
  });
});
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.dev-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: var(--bg-secondary);
  border-left: 2px solid var(--accent);
  height: 100%;
}
.panel-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--header-bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
}
.panel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.panel-section h4 {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.stat {
  font-size: 12px;
  color: var(--text-secondary);
}
.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 2px 0;
}
.stat-value {
  color: var(--text-primary);
  font-weight: 600;
}
.progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  margin-bottom: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--success);
  border-radius: 3px;
  transition: width 0.3s;
}
.progress-fill.warning {
  background: var(--warning);
}
.progress-fill.danger {
  background: var(--danger);
}
.tool-log {
  max-height: 200px;
  overflow-y: auto;
}
.log-entry {
  display: flex;
  gap: 8px;
  font-size: 11px;
  padding: 2px 0;
  color: var(--text-secondary);
  flex-wrap: wrap;
}
.log-entry.success .log-tool {
  color: var(--success);
}
.log-entry.error .log-tool {
  color: var(--danger);
}
.log-entry.timeout .log-tool {
  color: var(--warning);
}
.log-tool {
  font-weight: 600;
  width: 90px;
  flex-shrink: 0;
}
.log-target {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.log-duration {
  color: var(--text-muted);
  flex-shrink: 0;
}
.log-error {
  color: var(--danger);
  width: 100%;
}
</style>
