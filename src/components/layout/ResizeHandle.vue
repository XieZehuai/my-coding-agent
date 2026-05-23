<template>
  <div
    :class="['resize-handle', `axis-${axis}`, { active: active }]"
    @pointerdown="emit('resize-start', $event)"
    @dblclick="emit('reset')"
  />
</template>

<script setup lang="ts">
defineProps<{
  axis: 'horizontal' | 'vertical'
  active: boolean
}>()

const emit = defineEmits<{
  'resize-start': [e: PointerEvent]
  reset: []
}>()
</script>

<style scoped>
.resize-handle {
  position: relative;
  flex-shrink: 0;
  background: transparent;
  z-index: 10;
  transition: background 0.15s;
}
.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 2px;
  background: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s;
}
.resize-handle:hover::after,
.resize-handle.active::after {
  opacity: 0.4;
}
.resize-handle.active {
  background: var(--accent);
}

.axis-horizontal {
  width: 4px;
  cursor: col-resize;
}
.axis-horizontal::after {
  width: 2px;
  height: 32px;
}

.axis-vertical {
  height: 4px;
  cursor: row-resize;
}
.axis-vertical::after {
  width: 32px;
  height: 2px;
}
</style>
