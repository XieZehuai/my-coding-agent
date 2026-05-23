<template>
  <div class="input-box">
    <div class="status-bar">
      <span class="status-text">{{ inputStatus }}</span>
    </div>
    <div :class="['composer-shell', { focused: isFocused, disabled: chatStore.isActive }]">
      <div class="composer-inner">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          :disabled="chatStore.isActive"
          class="input-textarea"
          placeholder="Type @ for files, / for commands, # for skills..."
          rows="3"
          @keydown="handleKeydown"
          @input="handleInput"
          @focus="isFocused = true"
          @blur="isFocused = false"
        ></textarea>
        <div class="composer-actions">
          <span class="char-count">{{ inputText.length }}</span>
          <button v-if="!chatStore.isActive" :disabled="!canSend" class="send-btn" @click="handleSend">Send</button>
          <button v-else class="cancel-btn" @click="handleCancel">Cancel</button>
        </div>
      </div>
    </div>
    <div v-if="showFileSearch && fileResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in fileResults"
        :key="item"
        :class="['dropdown-item', { selected: index === fileSelectedIndex }]"
        @click="selectDropdownItem('file', item)"
      >
        <span :class="['file-marker', item.endsWith('/') ? 'folder' : 'file']"></span>
        <span>{{ item }}</span>
      </div>
    </div>
    <div v-if="showCmdSearch && cmdResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in cmdResults"
        :key="item"
        :class="['dropdown-item', { selected: index === cmdSelectedIndex }]"
        @click="selectDropdownItem('cmd', item)"
      >
        <span class="cmd-marker">/</span>
        <span>{{ item }}</span>
      </div>
    </div>
    <div v-if="showSkillSearch && skillResults.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in skillResults"
        :key="item.name"
        :class="['dropdown-item', { selected: index === skillSelectedIndex }]"
        @click="selectDropdownItem('skill', item)"
      >
        <span class="skill-marker">#</span>
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
const isFocused = ref(false);
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
  if (chatStore.isActive) return "Agent is responding";
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
  { immediate: true }
);

async function handleInput() {
  const el = textareaRef.value;
  if (el) {
    el.style.height = "auto";
    const maxH = Math.max(120, (layoutStore.inputHeight ?? 200) - 60);
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
  }
  const text = inputText.value;
  const cursorPos = el?.selectionStart ?? 0;
  const textBeforeCursor = text.substring(0, cursorPos);
  const atMatch = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
  const cmdMatch = textBeforeCursor.match(/(?:^|\s)\/([^\s]*)$/);
  const skillMatch = textBeforeCursor.match(/(?:^|\s)#([^\s]*)$/);
  if (atMatch) {
    showFileSearch.value = true;
    showCmdSearch.value = false;
    showSkillSearch.value = false;
    fileResults.value = [];
    fileSelectedIndex.value = 0;
    const project = projectStore.selectedProject;
    if (project) {
      try {
        fileResults.value = await window.api.searchFiles(project.path, atMatch[1]);
      } catch {}
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
  position: relative;
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

.composer-shell {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 8px 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.composer-shell.focused .composer-inner {
  border-color: var(--input-focus);
}
.composer-shell.disabled .composer-inner {
  opacity: 0.6;
}
.composer-inner {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-bg);
  overflow: hidden;
  transition: border-color 0.15s;
}

.input-textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  padding: 10px 14px;
  resize: none;
  outline: none;
  line-height: 1.5;
  overflow-y: auto;
}
.input-textarea::placeholder {
  color: var(--text-muted);
}
.input-textarea:disabled {
  cursor: not-allowed;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 6px 14px 10px;
}
.char-count {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: auto;
  font-family: "Consolas", "Courier New", monospace;
}

.send-btn,
.cancel-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
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
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}
.dropdown-item:hover,
.dropdown-item.selected {
  background: var(--bg-hover);
}

/* File/dir CSS markers */
.file-marker {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 3px;
  opacity: 0.7;
}
.file-marker.file {
  border: 1.5px solid var(--text-muted);
  background: transparent;
}
.file-marker.folder {
  background: var(--accent);
  opacity: 0.5;
  border-radius: 3px 3px 0 3px;
  clip-path: polygon(0% 30%, 0% 100%, 100% 100%, 100% 30%, 30% 30%, 30% 0%, 50% 0%);
}

/* Command marker */
.cmd-marker {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

/* Skill marker */
.skill-marker {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
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
