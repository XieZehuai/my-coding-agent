import { ref } from "vue";
import { useProjectStore } from "../stores/project";

export function useFileSearch() {
  const results = ref<string[]>([]);
  const isSearching = ref(false);
  const selectedIndex = ref(0);

  async function search(query: string) {
    const projectStore = useProjectStore();
    if (!projectStore.selectedProject || !query || query.length < 1) {
      results.value = [];
      return;
    }

    isSearching.value = true;
    try {
      results.value = await window.api.searchFiles(projectStore.selectedProject.path, query);
      selectedIndex.value = 0;
    } finally {
      isSearching.value = false;
    }
  }

  function clear() {
    results.value = [];
    selectedIndex.value = 0;
  }

  function moveUp() {
    if (selectedIndex.value > 0) selectedIndex.value--;
  }

  function moveDown() {
    if (selectedIndex.value < results.value.length - 1) selectedIndex.value++;
  }

  function getSelected(): string | null {
    return results.value[selectedIndex.value] ?? null;
  }

  return {
    results,
    isSearching,
    selectedIndex,
    search,
    clear,
    moveUp,
    moveDown,
    getSelected,
  };
}
