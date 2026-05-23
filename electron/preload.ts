import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Projects
  getProjects: () => ipcRenderer.invoke('project:list'),
  addProject: () => ipcRenderer.invoke('project:add'),
  removeProject: (id: string) => ipcRenderer.invoke('project:remove', id),

  // Conversations
  getConversations: (projectId: string) => ipcRenderer.invoke('conversation:list', projectId),
  createConversation: (projectId: string) => ipcRenderer.invoke('conversation:create', projectId),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversation:delete', id),
  renameConversation: (id: string, title: string) => ipcRenderer.invoke('conversation:rename', id, title),
  undoConversation: (id: string) => ipcRenderer.invoke('conversation:undo', id),

  // Messages
  getMessages: (convId: string) => ipcRenderer.invoke('message:list', convId),

  // Chat
  sendMessage: (convId: string, content: string, trustMode: boolean) =>
    ipcRenderer.invoke('chat:send', convId, content, trustMode),
  cancelMessage: (convId: string) => ipcRenderer.invoke('chat:cancel', convId),

  // Agent confirmation
  confirmAsk: (id: string, approved: boolean) => ipcRenderer.invoke('agent:confirm', id, approved),
  setTrustMode: (convId: string, enabled: boolean) => ipcRenderer.invoke('agent:set-trust', convId, enabled),

  // File search
  searchFiles: (projectPath: string, query: string) => ipcRenderer.invoke('file:search', projectPath, query),
  searchCommands: (projectPath: string, query: string) => ipcRenderer.invoke('command:search', projectPath, query),

  // Agent status
  getAgentStatus: (convId: string) => ipcRenderer.invoke('agent:status', convId),

  // Config
  getConfig: (projectPath: string) => ipcRenderer.invoke('config:read', projectPath),

  // Export/Import
  exportConversation: (convId: string) => ipcRenderer.invoke('conversation:export', convId),
  importConversation: (projectId: string) => ipcRenderer.invoke('conversation:import', projectId),

  // Event listeners
  onToken: (callback: (data: { convId: string; token: string }) => void) => {
    ipcRenderer.on('agent:token', (_event, data) => callback(data))
  },
  onToolStart: (callback: (data: { convId: string; toolName: string; toolCallId: string; args: unknown }) => void) => {
    ipcRenderer.on('agent:tool-start', (_event, data) => callback(data))
  },
  onToolEnd: (callback: (data: { convId: string; toolCallId: string; result: string }) => void) => {
    ipcRenderer.on('agent:tool-end', (_event, data) => callback(data))
  },
  onToolError: (callback: (data: { convId: string; toolCallId: string; error: string }) => void) => {
    ipcRenderer.on('agent:tool-error', (_event, data) => callback(data))
  },
  onAsk: (callback: (data: { convId: string; askId: string; toolName: string; detail: string }) => void) => {
    ipcRenderer.on('agent:ask', (_event, data) => callback(data))
  },
  onComplete: (callback: (data: { convId: string }) => void) => {
    ipcRenderer.on('agent:complete', (_event, data) => callback(data))
  },
  onCancelled: (callback: (data: { convId: string }) => void) => {
    ipcRenderer.on('agent:cancelled', (_event, data) => callback(data))
  },
  onError: (callback: (data: { convId: string; error: string }) => void) => {
    ipcRenderer.on('agent:error', (_event, data) => callback(data))
  },
  onStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on('agent:status', (_event, data) => callback(data))
  },
  onTitleGenerated: (callback: (data: { convId: string; title: string }) => void) => {
    ipcRenderer.on('agent:title-generated', (_event, data) => callback(data))
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type AgentAPI = typeof api
