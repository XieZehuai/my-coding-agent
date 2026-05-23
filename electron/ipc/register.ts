import { dialog } from 'electron'
import { IPC } from '../../shared/types'
import { registerHandler } from './handlers'
import {
  listAllProjects,
  createProject,
  removeProject,
} from '../services/project-service'
import {
  listProjectConversations,
  newConversation,
  removeConversation,
  renameConversation,
  undoConversationChanges,
  buildExportData,
  importConversationFromFile,
} from '../services/conversation-service'
import { listMessages } from '../db/messages'
import { readConfig } from '../utils/config'
import { resolveConfirmation, setTrustMode, getAgentStatus } from '../services/agent-service'
import { sendChatMessage, cancelChat } from '../services/chat-service'
import { searchFiles } from '../services/file-service'
import { searchCommands } from '../services/command-service'
import * as fs from 'fs'

export function registerAllHandlers() {
  // ============================================================
  // Project Handlers
  // ============================================================
  registerHandler(IPC.PROJECT_LIST, async () => {
    return listAllProjects()
  })

  registerHandler(IPC.PROJECT_ADD, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return createProject(result.filePaths[0])
  })

  registerHandler(IPC.PROJECT_REMOVE, async (_event, id: string) => {
    removeProject(id)
    return true
  })

  // ============================================================
  // Conversation Handlers
  // ============================================================
  registerHandler(IPC.CONV_LIST, async (_event, projectId: string) => {
    return listProjectConversations(projectId)
  })

  registerHandler(IPC.CONV_CREATE, async (_event, projectId: string) => {
    return newConversation(projectId)
  })

  registerHandler(IPC.CONV_DELETE, async (_event, id: string) => {
    removeConversation(id)
    return true
  })

  registerHandler(IPC.CONV_RENAME, async (_event, id: string, title: string) => {
    renameConversation(id, title)
    return true
  })

  registerHandler(IPC.CONV_UNDO, async (_event, convId: string) => {
    return undoConversationChanges(convId)
  })

  // ============================================================
  // Message Handlers
  // ============================================================
  registerHandler(IPC.MESSAGE_LIST, async (_event, convId: string) => {
    return listMessages(convId)
  })

  // ============================================================
  // Chat Handlers
  // ============================================================
  registerHandler(IPC.CHAT_SEND, async (_event, convId: string, content: string, trustMode = false) => {
    sendChatMessage(convId, content, trustMode)
    return { success: true }
  })

  registerHandler(IPC.CHAT_CANCEL, async (_event, convId: string) => {
    return cancelChat(convId)
  })

  // ============================================================
  // Agent Handlers
  // ============================================================
  registerHandler(IPC.AGENT_CONFIRM, async (_event, askId: string, approved: boolean) => {
    resolveConfirmation(askId, approved)
    return true
  })

  registerHandler(IPC.AGENT_SET_TRUST, async (_event, convId: string, enabled: boolean) => {
    setTrustMode(convId, enabled)
    return true
  })

  registerHandler(IPC.AGENT_STATUS, async (_event, convId: string) => {
    return getAgentStatus(convId)
  })

  // ============================================================
  // File Handlers
  // ============================================================
  registerHandler(IPC.FILE_SEARCH, async (_event, projectPath: string, query: string) => {
    return searchFiles(projectPath, query)
  })

  registerHandler(IPC.COMMAND_SEARCH, async (_event, projectPath: string, query: string) => {
    return searchCommands(projectPath, query)
  })

  // ============================================================
  // Config Handlers
  // ============================================================
  registerHandler(IPC.CONFIG_READ, async (_event, projectPath: string) => {
    return readConfig(projectPath)
  })

  // ============================================================
  // Export / Import Handlers
  // ============================================================
  registerHandler(IPC.CONV_EXPORT, async (_event, convId: string) => {
    const data = buildExportData(convId)

    const result = await dialog.showSaveDialog({
      title: 'Export Conversation',
      defaultPath: `${data.conversation.title}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) return null

    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    return result.filePath
  })

  registerHandler(IPC.CONV_IMPORT, async (_event, projectId: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Import Conversation',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    return importConversationFromFile(projectId, result.filePaths[0])
  })
}
