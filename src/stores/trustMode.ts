import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTrustModeStore = defineStore('trustMode', () => {
  const trustModeMap = ref<Record<string, boolean>>({})

  function isTrusted(convId: string): boolean {
    return trustModeMap.value[convId] ?? false
  }

  function toggle(convId: string) {
    const next = !isTrusted(convId)
    trustModeMap.value[convId] = next
    window.api.setTrustMode(convId, next)
  }

  function setTrusted(convId: string, value: boolean) {
    trustModeMap.value[convId] = value
    window.api.setTrustMode(convId, value)
  }

  return {
    trustModeMap,
    isTrusted,
    toggle,
    setTrusted,
  }
})
