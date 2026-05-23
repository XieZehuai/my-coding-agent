<template>
  <ErrorBoundary>
    <AppLayout />
  </ErrorBoundary>
</template>

<script setup lang="ts">
import './styles/theme.css'
import { useThemeStore } from './stores/theme'
import AppLayout from './components/layout/AppLayout.vue'
import ErrorBoundary from './components/layout/ErrorBoundary.vue'

useThemeStore()
</script>
