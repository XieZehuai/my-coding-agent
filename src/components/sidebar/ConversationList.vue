<template>
  <div class="sidebar-section conversations-section">
    <div class="section-header">
      <span>Conversations</span>
      <button class="btn-icon" :disabled="!projectStore.selectedProjectId" @click="handleCreate" title="New Conversation">+</button>
    </div>
    <div class="section-list conversation-list">
      <div
        v-for="conv in convStore.conversations" :key="conv.id"
        :class="['sidebar-item', { active: conv.id === convStore.selectedConversationId }]"
        @click="handleSelect(conv.id)"
        @contextmenu.prevent="showContextMenu(conv.id, $event)"
        @dblclick="startRename(conv)"
      >
        <span class="item-icon">&#128172;</span>
        <div class="item-content">
          <span v-if="renamingId !== conv.id" class="item-label">{{ conv.title }}</span>
          <input v-else ref="renameInput" v-model="renameValue" class="rename-input"
            @blur="finishRename(conv.id)" @keydown.enter="finishRename(conv.id)"
            @keydown.escape="cancelRename" @click.stop />
          <span class="item-date">{{ formatDate(conv.updatedAt) }}</span>
        </div>
      </div>
      <div v-if="convStore.conversations.length === 0 && projectStore.selectedProjectId" class="empty-hint">Click + to start</div>
      <div v-if="!projectStore.selectedProjectId" class="empty-hint">Select a project first</div>
    </div>

    <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <button @click="handleDelete">Delete</button>
      <button @click="handleUndo">Undo Changes</button>
      <button @click="handleExport">Export</button>
      <button @click="handleImport">Import</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useConversationStore } from '../../stores/conversation'
import { useChatStore } from '../../stores/chat'

const projectStore = useProjectStore()
const convStore = useConversationStore()
const chatStore = useChatStore()

const contextMenu = reactive({ visible: false, x: 0, y: 0, convId: null as string | null })
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function showContextMenu(id: string, event: MouseEvent) {
  contextMenu.visible = true; contextMenu.x = event.clientX; contextMenu.y = event.clientY; contextMenu.convId = id
}
function hideContextMenu() { contextMenu.visible = false }
onMounted(() => document.addEventListener('click', hideContextMenu))
onUnmounted(() => document.removeEventListener('click', hideContextMenu))

async function handleCreate() { chatStore.reset(); await convStore.createConversation() }
async function handleSelect(id: string) { convStore.selectConversation(id); chatStore.reset(); await chatStore.loadMessages(id) }
async function handleDelete() { if (contextMenu.convId) { chatStore.reset(); await convStore.deleteConversation(contextMenu.convId) } hideContextMenu() }
async function handleUndo() { if (contextMenu.convId) { const r = await convStore.undoConversation(contextMenu.convId); if (r) alert(r.message) } hideContextMenu() }
async function handleExport() { if (contextMenu.convId) await window.api.exportConversation(contextMenu.convId); hideContextMenu() }
async function handleImport() { if (projectStore.selectedProjectId) { await window.api.importConversation(projectStore.selectedProjectId); await convStore.loadConversations() } hideContextMenu() }

async function startRename(conv: { id: string; title: string }) {
  renamingId.value = conv.id; renameValue.value = conv.title; await nextTick(); renameInput.value?.focus(); renameInput.value?.select()
}
async function finishRename(id: string) {
  if (renamingId.value === id) { const t = renameValue.value.trim() || '未命名'; await convStore.renameConversation(id, t); renamingId.value = null }
}
function cancelRename() { renamingId.value = null }

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.sidebar-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
.btn-icon { background: none; border: none; color: var(--text-secondary); font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.btn-icon:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
.btn-icon:disabled { opacity: 0.3; cursor: default; }
.section-list { flex: 1; overflow-y: auto; }
.sidebar-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; color: var(--text-primary); transition: background 0.1s; }
.sidebar-item:hover { background: var(--bg-hover); }
.sidebar-item.active { background: var(--bg-active); }
.item-icon { font-size: 14px; flex-shrink: 0; }
.item-content { flex: 1; min-width: 0; }
.item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.item-date { font-size: 10px; color: var(--text-muted); }
.rename-input { width: 100%; background: var(--bg-primary); border: 1px solid var(--accent); color: var(--text-primary); font-size: 13px; padding: 2px 4px; border-radius: 3px; outline: none; }
.empty-hint { padding: 10px 12px; font-size: 12px; color: var(--text-muted); }
.context-menu { position: fixed; z-index: 1000; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 6px; padding: 4px; min-width: 120px; }
.context-menu button { display: block; width: 100%; padding: 6px 12px; background: none; border: none; color: var(--text-primary); font-size: 13px; text-align: left; cursor: pointer; border-radius: 4px; }
.context-menu button:hover { background: var(--bg-hover); color: var(--danger); }
</style>
