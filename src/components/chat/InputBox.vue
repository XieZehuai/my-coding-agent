<template>
  <div class="input-box">
    <div class="status-bar">
      <span class="status-text">{{ inputStatus }}</span>
    </div>
    <div class="input-container">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        :disabled="chatStore.isStreaming"
        class="input-textarea"
        placeholder="Type @ for files, / for commands, # for skills..."
        rows="3"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
      <button v-if="!chatStore.isStreaming" :disabled="!canSend" class="send-btn" @click="handleSend">Send</button>
      <button v-else class="cancel-btn" @click="handleCancel">Cancel</button>
    </div>
    <div v-if="showFileSearch && fileResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in fileResults"
        :key="item"
        :class="['dropdown-item', { selected: index === fileSelectedIndex }]"
        @click="selectDropdownItem('file', item)"
      >
        <span class="item-icon">{{ item.endsWith("/") ? "📁" : "📄" }}</span
        ><span>{{ item }}</span>
      </div>
    </div>
    <div v-if="showCmdSearch && cmdResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in cmdResults"
        :key="item"
        :class="['dropdown-item', { selected: index === cmdSelectedIndex }]"
        @click="selectDropdownItem('cmd', item)"
      >
        <span class="item-icon">⚙</span><span>{{ item }}</span>
      </div>
    </div>
    <div v-if="showSkillSearch && skillResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in skillResults"
        :key="item.name"
        :class="['dropdown-item', { selected: index === skillSelectedIndex }]"
        @click="selectDropdownItem('skill', item)"
      >
        <span class="item-icon">#</span>
        <div class="skill-item-info">
          <span class="skill-item-name">{{ item.name }}</span>
          <span class="skill-item-desc">{{ item.description }}</span>
        </div>
      </div>
    </div>
    <div class="input-footer"><span class="hint">Enter to send, Shift+Enter for newline</span></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useConversationStore } from "../../stores/conversation";
import { useChatStore } from "../../stores/chat";
import { useProjectStore } from "../../stores/project";
import { useLayoutStore } from "../../stores/layout";
import { useAgent } from "../../composables/useAgent";

const convStore = useConversationStore();
const chatStore = useChatStore();
const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const { sendMessage, cancelMessage, setupListeners } = useAgent();

const inputText = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const showFileSearch = ref(false);
const showCmdSearch = ref(false);
const showSkillSearch = ref(false);
const fileResults = ref<string[]>([]);
const cmdResults = ref<string[]>([]);
const skillResults = ref<{ name: string; description: string }[]>([]);
const fileSelectedIndex = ref(0);
const cmdSelectedIndex = ref(0);
const skillSelectedIndex = ref(0);

const canSend = computed(() => convStore.selectedConversationId && inputText.value.trim().length > 0);
const inputStatus = computed(() => {
  if (chatStore.isStreaming) return "Agent is responding";
  if (showFileSearch.value) return "File search";
  if (showCmdSearch.value) return "Command";
  if (showSkillSearch.value) return "Skill";
  if (!convStore.selectedConversationId) return "No conversation selected";
  return "Ready";
});

watch(
  () => convStore.selectedConversationId,
  (newId) => {
    inputText.value = "";
    if (newId) setupListeners(newId);
  },
  { immediate: true },
);

async function handleInput() {
  console.log('[handleInput] called, text:', JSON.stringify(inputText.value));
  const el = textareaRef.value;
  if (el) {
    el.style.height = "auto";
    const containerHeight = el.parentElement?.clientHeight ?? layoutStore.inputHeight;
    const maxH = containerHeight - 16;
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
  }
  const text = inputText.value;
  const cursorPos = el?.selectionStart ?? 0;
  const textBeforeCursor = text.substring(0, cursorPos);
  const atMatch = textBeforeCursor.match(/@([^\s]*)$/);
  const cmdMatch = textBeforeCursor.match(/\/([^\s]*)$/);
  const skillMatch = textBeforeCursor.match(/#([^\s]*)$/);
  if (atMatch) {
    showFileSearch.value = true;
    showCmdSearch.value = false;
    showSkillSearch.value = false;
    fileResults.value = [];
    fileSelectedIndex.value = 0;
    const project = projectStore.selectedProject;
    console.log('[handleInput] atMatch detected, project:', project?.path, 'query:', atMatch[1]);
    if (project) {
      try {
        const results = await window.api.searchFiles(project.path, atMatch[1]);
        console.log('[handleInput] searchFiles results:', results.length, 'showFileSearch:', showFileSearch.value);
        fileResults.value = results;
        await nextTick();
        console.log('[handleInput] after nextTick, fileResults.length:', fileResults.value.length, 'showFileSearch:', showFileSearch.value);
      } catch (e) {
        console.error('[handleInput] searchFiles error:', e);
      }
    }
  } else if (cmdMatch) {
    showCmdSearch.value = true;
    showFileSearch.value = false;
    showSkillSearch.value = false;
    cmdResults.value = [];
    cmdSelectedIndex.value = 0;
    const project = projectStore.selectedProject;
    if (project) {
      try {
        cmdResults.value = await window.api.searchCommands(project.path, cmdMatch[1]);
      } catch {}
    }
  } else if (skillMatch) {
    showSkillSearch.value = true;
    showFileSearch.value = false;
    showCmdSearch.value = false;
    skillResults.value = [];
    skillSelectedIndex.value = 0;
    const project = projectStore.selectedProject;
    if (project) {
      try {
        skillResults.value = await window.api.searchSkills(project.path, skillMatch[1]);
      } catch {}
    }
  } else {
    showFileSearch.value = false;
    showCmdSearch.value = false;
    showSkillSearch.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (showFileSearch.value && fileResults.value.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      fileSelectedIndex.value = Math.min(fileSelectedIndex.value + 1, fileResults.value.length - 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      fileSelectedIndex.value = Math.max(fileSelectedIndex.value - 1, 0);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectDropdownItem("file", fileResults.value[fileSelectedIndex.value]);
      return;
    }
    if (e.key === "Escape") {
      showFileSearch.value = false;
      return;
    }
  }
  if (showCmdSearch.value && cmdResults.value.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cmdSelectedIndex.value = Math.min(cmdSelectedIndex.value + 1, cmdResults.value.length - 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      cmdSelectedIndex.value = Math.max(cmdSelectedIndex.value - 1, 0);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectDropdownItem("cmd", cmdResults.value[cmdSelectedIndex.value]);
      return;
    }
    if (e.key === "Escape") {
      showCmdSearch.value = false;
      return;
    }
  }
  if (showSkillSearch.value && skillResults.value.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      skillSelectedIndex.value = Math.min(skillSelectedIndex.value + 1, skillResults.value.length - 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      skillSelectedIndex.value = Math.max(skillSelectedIndex.value - 1, 0);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectDropdownItem("skill", skillResults.value[skillSelectedIndex.value]);
      return;
    }
    if (e.key === "Escape") {
      showSkillSearch.value = false;
      return;
    }
  }
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

function selectDropdownItem(type: "file" | "cmd" | "skill", item: string | { name: string; description: string }) {
  const text = inputText.value;
  const el = textareaRef.value;
  const cursorPos = el?.selectionStart ?? text.length;
  const textBeforeCursor = text.substring(0, cursorPos);
  if (type === "file") {
    const fileItem = item as string;
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const cleanFile = fileItem.endsWith("/") ? fileItem.slice(0, -1) : fileItem;
    inputText.value =
      (atIndex >= 0 ? text.substring(0, atIndex) : "") + `@file:${cleanFile} ` + text.substring(cursorPos);
    showFileSearch.value = false;
  } else if (type === "cmd") {
    const cmdItem = item as string;
    const slashIndex = textBeforeCursor.lastIndexOf("/");
    inputText.value =
      (slashIndex >= 0 ? text.substring(0, slashIndex) : "") + cmdItem + " " + text.substring(cursorPos);
    showCmdSearch.value = false;
  } else {
    const skillItem = item as { name: string; description: string };
    const hashIndex = textBeforeCursor.lastIndexOf("#");
    inputText.value =
      (hashIndex >= 0 ? text.substring(0, hashIndex) : "") + "#" + skillItem.name + " " + text.substring(cursorPos);
    showSkillSearch.value = false;
  }
  nextTick(() => textareaRef.value?.focus());
}

async function handleSend() {
  if (!canSend.value) return;
  const content = inputText.value.trim();
  inputText.value = "";
  const el = textareaRef.value;
  if (el) el.style.height = "auto";
  chatStore.addMessage({
    id: crypto.randomUUID(),
    convId: convStore.selectedConversationId!,
    role: "user",
    segments: [{ type: "text", content }],
    createdAt: Date.now(),
  });
  await sendMessage(convStore.selectedConversationId!, content);
}

async function handleCancel() {
  if (convStore.selectedConversationId) await cancelMessage(convStore.selectedConversationId);
}
</script>

<style scoped>
.input-box {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}
.status-bar {
  padding: 4px 20px 0;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.status-text {
  font-size: 11px;
  color: var(--text-muted);
}
.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  max-width: 800px;
  margin: 0 auto;
  padding: 8px 20px;
  width: 100%;
  flex: 1;
}
.input-textarea {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  padding: 10px 14px;
  resize: none;
  outline: none;
  line-height: 1.5;
  overflow-y: auto;
}
.input-textarea:focus {
  border-color: var(--input-focus);
}
.input-textarea::placeholder {
  color: var(--text-muted);
}
.send-btn,
.cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.send-btn {
  background: var(--accent);
  color: var(--accent-text);
}
.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}
.send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.cancel-btn {
  background: var(--danger);
  color: #fff;
}
.cancel-btn:hover {
  background: var(--danger-hover);
}
.autocomplete-dropdown {
  position: absolute;
  bottom: 100%;
  left: 20px;
  right: 20px;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}
.dropdown-item:hover,
.dropdown-item.selected {
  background: var(--bg-hover);
}
.item-icon {
  font-size: 14px;
}
.skill-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.skill-item-name {
  font-size: 13px;
  color: var(--text-primary);
}
.skill-item-desc {
  font-size: 11px;
  color: var(--text-muted);
}
.input-footer {
  padding: 4px 20px 8px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
