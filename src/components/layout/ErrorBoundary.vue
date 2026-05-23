<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-screen">
      <h2>Something went wrong</h2>
      <p>{{ error?.message || 'An unexpected error occurred.' }}</p>
      <button @click="resetError">Try Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
const hasError = ref(false)
const error = ref<Error | null>(null)
onErrorCaptured((err) => { hasError.value = true; error.value = err; console.error('Render error:', err); return false })
function resetError() { hasError.value = false; error.value = null }
</script>

<style scoped>
.error-boundary { height: 100vh; }
.error-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--danger); padding: 40px; text-align: center; }
.error-screen h2 { font-size: 20px; }
.error-screen p { color: var(--text-secondary); font-size: 14px; max-width: 400px; }
.error-screen button { margin-top: 12px; padding: 8px 24px; background: var(--accent); border: none; border-radius: 6px; color: var(--accent-text); font-weight: 600; cursor: pointer; }
</style>
