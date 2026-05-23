<template>
  <div
    class="app-layout"
    :class="{ 'is-resizing': sidebarResize.isDragging.value }"
    :style="{ '--sidebar-width': layoutStore.sidebarWidth + 'px' }"
  >
    <aside
      class="sidebar"
      :style="{ width: layoutStore.sidebarWidth + 'px', minWidth: layoutStore.sidebarWidth + 'px' }"
    >
      <ProjectList />
      <ConversationList />
      <ThemeToggle />
    </aside>
    <ResizeHandle
      axis="horizontal"
      :active="sidebarResize.isDragging.value"
      @resize-start="sidebarResize.onPointerDown"
      @reset="layoutStore.sidebarWidth = 280"
    />
    <main class="main-content">
      <ChatWindow />
    </main>
    <PermissionModal />
    <DevPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useProjectStore } from "../../stores/project";
import { useLayoutStore } from "../../stores/layout";
import { useResizable } from "../../composables/useResizable";
import ProjectList from "../sidebar/ProjectList.vue";
import ConversationList from "../sidebar/ConversationList.vue";
import ChatWindow from "../chat/ChatWindow.vue";
import PermissionModal from "../modals/PermissionModal.vue";
import DevPanel from "../dev/DevPanel.vue";
import ThemeToggle from "../layout/ThemeToggle.vue";
import ResizeHandle from "../layout/ResizeHandle.vue";

const projectStore = useProjectStore();
const layoutStore = useLayoutStore();

const sidebarResize = useResizable({
  value: computed({
    get: () => layoutStore.sidebarWidth,
    set: (v) => {
      layoutStore.sidebarWidth = v;
    },
  }),
  min: 200,
  max: 500,
  axis: "horizontal",
  onDragStart: () => {},
  onDragEnd: () => {},
});

onMounted(async () => {
  await projectStore.loadProjects();
  layoutStore.clampOnMount();
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.app-layout.is-resizing {
  user-select: none;
}

.sidebar {
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--chat-bg);
}
</style>
