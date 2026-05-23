import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'light'
  )

  watch(mode, (val) => {
    document.documentElement.className = val === 'dark' ? 'dark' : ''
    localStorage.setItem('theme', val)
  }, { immediate: true })

  function toggle() {
    mode.value = mode.value === 'light' ? 'dark' : 'light'
  }

  return { mode, toggle }
})
