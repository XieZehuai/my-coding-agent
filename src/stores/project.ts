import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '@shared/types'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const selectedProjectId = ref<string | null>(null)
  const loading = ref(false)

  const selectedProject = computed(() =>
    projects.value.find((p) => p.id === selectedProjectId.value) ?? null
  )

  async function loadProjects() {
    loading.value = true
    try {
      projects.value = await window.api.getProjects()
    } finally {
      loading.value = false
    }
  }

  async function addProject() {
    const project = await window.api.addProject()
    if (project) {
      projects.value.unshift(project)
      selectedProjectId.value = project.id
    }
    return project
  }

  async function removeProject(id: string) {
    await window.api.removeProject(id)
    projects.value = projects.value.filter((p) => p.id !== id)
    if (selectedProjectId.value === id) {
      selectedProjectId.value = projects.value[0]?.id ?? null
    }
  }

  function selectProject(id: string) {
    selectedProjectId.value = id
  }

  return {
    projects,
    selectedProjectId,
    selectedProject,
    loading,
    loadProjects,
    addProject,
    removeProject,
    selectProject,
  }
})
