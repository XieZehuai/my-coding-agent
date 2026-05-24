import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Conversation } from "@shared/types";
import { useProjectStore } from "./project";
import { useTrustModeStore } from "./trustMode";

export const useConversationStore = defineStore("conversation", () => {
  const conversations = ref<Conversation[]>([]);
  const selectedConversationId = ref<string | null>(null);
  const loading = ref(false);

  const selectedConversation = computed(
    () => conversations.value.find((c) => c.id === selectedConversationId.value) ?? null
  );

  async function loadConversations() {
    const projectStore = useProjectStore();
    if (!projectStore.selectedProjectId) {
      conversations.value = [];
      return;
    }

    loading.value = true;
    try {
      conversations.value = await window.api.getConversations(projectStore.selectedProjectId);
      const trustStore = useTrustModeStore();
      for (const conv of conversations.value) {
        trustStore.trustModeMap[conv.id] = conv.trustMode ?? false;
      }
    } finally {
      loading.value = false;
    }
  }

  async function createConversation() {
    const projectStore = useProjectStore();
    if (!projectStore.selectedProjectId) return null;

    const conv = await window.api.createConversation(projectStore.selectedProjectId);
    if (conv) {
      conversations.value.unshift(conv);
      selectedConversationId.value = conv.id;
    }
    return conv;
  }

  async function deleteConversation(id: string) {
    await window.api.deleteConversation(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
    if (selectedConversationId.value === id) {
      selectedConversationId.value = conversations.value[0]?.id ?? null;
    }
  }

  async function renameConversation(id: string, title: string) {
    await window.api.renameConversation(id, title);
    const conv = conversations.value.find((c) => c.id === id);
    if (conv) conv.title = title;
  }

  async function undoConversation(id: string) {
    return window.api.undoConversation(id);
  }

  function selectConversation(id: string) {
    selectedConversationId.value = id;
  }

  function updateTitle(id: string, title: string) {
    const conv = conversations.value.find((c) => c.id === id);
    if (conv) {
      conv.title = title;
    }
  }

  return {
    conversations,
    selectedConversationId,
    selectedConversation,
    loading,
    loadConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    undoConversation,
    selectConversation,
    updateTitle,
  };
});
