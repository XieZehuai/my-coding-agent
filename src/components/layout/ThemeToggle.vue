<template>
  <button class="theme-toggle" @click="themeStore.toggle" :title="themeStore.mode === 'light' ? 'Switch to dark' : 'Switch to light'">
    {{ themeStore.mode === 'light' ? '🌙' : '☀️' }}
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '../../stores/theme'
const themeStore = useThemeStore()
</script>

<style scoped>
.theme-toggle {
  width: 100%;
  padding: 8px;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: auto;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
