import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type IPCChannel } from '../shared/types'

const api = {
  // Projects
  getProjects: () => ipcRenderer.invoke(IPC.PROJECT_LIST),
  addProject: () => ipcRenderer.invoke(IPC.PROJECT_ADD),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.PROJECT_REMOVE, id),

  // Conversations
  getConversations: (projectId: string) => ipcRenderer.invoke(IPC.CONV_LIST, projectId),
  createConversation: (projectId: string) => ipcRenderer.invoke(IPC.CONV_CREATE, projectId),
  deleteConversation: (id: string) => ipcRenderer.invoke(IPC.CONV_DELETE, id),
  renameConversation: (id: string, title: string) =>
    ipcRenderer.invoke(IPC.CONV_RENAME, id, title),
  undoConversation: (id: string) => ipcRenderer.invoke(IPC.CONV_UNDO, id),

  // Messages
  getMessages: (convId: string) => ipcRenderer.invoke(IPC.MESSAGE_LIST, convId),

  // Chat
  sendMessage: (convId: string, content: string, trustMode: boolean) =>
    ipcRenderer.invoke(IPC.CHAT_SEND, convId, content, trustMode),
  cancelMessage: (convId: string) => ipcRenderer.invoke(IPC.CHAT_CANCEL, convId),

  // Agent confirmation
  confirmAsk: (id: string, approved: boolean) => ipcRenderer.invoke(IPC.AGENT_CONFIRM, id, approved),
  setTrustMode: (convId: string, enabled: boolean) =>
    ipcRenderer.invoke(IPC.AGENT_SET_TRUST, convId, enabled),

  // File search
  searchFiles: (projectPath: string, query: string) =>
    ipcRenderer.invoke(IPC.FILE_SEARCH, projectPath, query),
  searchCommands: (projectPath: string, query: string) =>
    ipcRenderer.invoke(IPC.COMMAND_SEARCH, projectPath, query),
  searchSkills: (projectPath: string, query: string) =>
    ipcRenderer.invoke(IPC.SKILL_SEARCH, projectPath, query),

  // Agent status
  getAgentStatus: (convId: string) => ipcRenderer.invoke(IPC.AGENT_STATUS, convId),

  // Config
  getConfig: (projectPath: string) => ipcRenderer.invoke(IPC.CONFIG_READ, projectPath),

  // Export/Import
  exportConversation: (convId: string) => ipcRenderer.invoke(IPC.CONV_EXPORT, convId),
  importConversation: (projectId: string) => ipcRenderer.invoke(IPC.CONV_IMPORT, projectId),

  // Event listeners
  onToken: (callback: (data: { convId: string; token: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_TOKEN, (_event, data) => callback(data))
  },
  onToolStart: (callback: (data: { convId: string; toolName: string; toolCallId: string; args: unknown }) => void) => {
    ipcRenderer.on(IPC.EVENT_TOOL_START, (_event, data) => callback(data))
  },
  onToolEnd: (callback: (data: { convId: string; toolCallId: string; result: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_TOOL_END, (_event, data) => callback(data))
  },
  onToolError: (callback: (data: { convId: string; toolCallId: string; error: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_TOOL_ERROR, (_event, data) => callback(data))
  },
  onAsk: (callback: (data: { convId: string; askId: string; toolName: string; detail: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_ASK, (_event, data) => callback(data))
  },
  onComplete: (callback: (data: { convId: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_COMPLETE, (_event, data) => callback(data))
  },
  onCancelled: (callback: (data: { convId: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_CANCELLED, (_event, data) => callback(data))
  },
  onError: (callback: (data: { convId: string; error: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_ERROR, (_event, data) => callback(data))
  },
  onStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on(IPC.EVENT_STATUS, (_event, data) => callback(data))
  },
  onTitleGenerated: (callback: (data: { convId: string; title: string }) => void) => {
    ipcRenderer.on(IPC.EVENT_TITLE_GENERATED, (_event, data) => callback(data))
  },

  removeAllListeners: (channel: IPCChannel) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type AgentAPI = typeof api
