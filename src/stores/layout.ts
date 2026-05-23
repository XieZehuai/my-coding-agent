import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const LAYOUT_DEFAULTS = {
  sidebarWidth: 280,
  inputHeight: 120,
  devPanelWidth: 280,
  devPanelVisible: true,
} as const

export const LAYOUT_CONSTRAINTS = {
  sidebar: { min: 200, max: 500 },
  input: { min: 60, maxVh: 0.5 },
  devPanel: { min: 200, maxVw: 0.4 },
} as const

function loadNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(`layout:${key}`)
  if (raw !== null) {
    const parsed = Number(raw)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallback
}

function loadBoolean(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(`layout:${key}`)
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}

export const useLayoutStore = defineStore('layout', () => {
  const sidebarWidth = ref(loadNumber('sidebarWidth', LAYOUT_DEFAULTS.sidebarWidth))
  const inputHeight = ref(loadNumber('inputHeight', LAYOUT_DEFAULTS.inputHeight))
  const devPanelWidth = ref(loadNumber('devPanelWidth', LAYOUT_DEFAULTS.devPanelWidth))
  const devPanelVisible = ref(loadBoolean('devPanelVisible', LAYOUT_DEFAULTS.devPanelVisible))

  watch(sidebarWidth, (val) => {
    localStorage.setItem('layout:sidebarWidth', String(val))
  })

  watch(inputHeight, (val) => {
    localStorage.setItem('layout:inputHeight', String(val))
  })

  watch(devPanelWidth, (val) => {
    localStorage.setItem('layout:devPanelWidth', String(val))
  })

  watch(devPanelVisible, (val) => {
    localStorage.setItem('layout:devPanelVisible', String(val))
  })

  function clampOnMount() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    sidebarWidth.value = Math.min(sidebarWidth.value, Math.max(LAYOUT_CONSTRAINTS.sidebar.min, vw * 0.5))
    inputHeight.value = Math.min(inputHeight.value, Math.max(LAYOUT_CONSTRAINTS.input.min, vh * LAYOUT_CONSTRAINTS.input.maxVh))
    devPanelWidth.value = Math.min(devPanelWidth.value, Math.max(LAYOUT_CONSTRAINTS.devPanel.min, vw * LAYOUT_CONSTRAINTS.devPanel.maxVw))
  }

  return { sidebarWidth, inputHeight, devPanelWidth, devPanelVisible, clampOnMount }
})
