<template>
  <div class="sidebar-section">
    <div class="section-header">
      <span>Projects</span>
      <button class="btn-icon" @click="handleAddProject" title="Add Project">+</button>
    </div>
    <div class="section-list">
      <div
        v-for="project in projectStore.projects"
        :key="project.id"
        :class="['sidebar-item', { active: project.id === projectStore.selectedProjectId }]"
        @click="handleSelectProject(project.id)"
        @contextmenu.prevent="showContextMenu(project.id, $event)"
      >
        <span class="item-icon">&#128193;</span>
        <span class="item-label">{{ project.name }}</span>
      </div>
      <div v-if="projectStore.projects.length === 0" class="empty-hint">
        Click + to add a project
      </div>
    </div>

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <button @click="handleRemoveProject">Remove</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useConversationStore } from '../../stores/conversation'
import { useChatStore } from '../../stores/chat'

const projectStore = useProjectStore()
const convStore = useConversationStore()
const chatStore = useChatStore()

const contextMenu = reactive({
  visible: false, x: 0, y: 0, projectId: null as string | null,
})

function showContextMenu(id: string, event: MouseEvent) {
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.projectId = id
}

function hideContextMenu() { contextMenu.visible = false }
onMounted(() => document.addEventListener('click', hideContextMenu))
onUnmounted(() => document.removeEventListener('click', hideContextMenu))

async function handleAddProject() {
  await projectStore.addProject()
  await convStore.loadConversations()
}

async function handleSelectProject(id: string) {
  projectStore.selectProject(id)
  chatStore.reset()
  await convStore.loadConversations()
}

async function handleRemoveProject() {
  if (contextMenu.projectId) {
    await projectStore.removeProject(contextMenu.projectId)
    chatStore.reset()
    await convStore.loadConversations()
  }
  hideContextMenu()
}
</script>

<style scoped>
.sidebar-section { border-bottom: 1px solid var(--border); }

.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary);
}

.btn-icon {
  background: none; border: none; color: var(--text-secondary);
  font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px;
}
.btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }

.section-list { max-height: 200px; overflow-y: auto; }

.sidebar-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 12px;
  cursor: pointer; font-size: 13px; color: var(--text-primary);
  transition: background 0.1s;
}
.sidebar-item:hover { background: var(--bg-hover); }
.sidebar-item.active { background: var(--bg-active); }

.item-icon { font-size: 14px; }
.item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint { padding: 10px 12px; font-size: 12px; color: var(--text-muted); }

.context-menu {
  position: fixed; z-index: 1000; background: var(--bg-tertiary);
  border: 1px solid var(--border); border-radius: 6px; padding: 4px; min-width: 120px;
}
.context-menu button {
  display: block; width: 100%; padding: 6px 12px; background: none;
  border: none; color: var(--text-primary); font-size: 13px; text-align: left;
  cursor: pointer; border-radius: 4px;
}
.context-menu button:hover { background: var(--bg-hover); color: var(--danger); }
</style>
