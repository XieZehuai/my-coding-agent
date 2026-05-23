import * as fs from 'fs'
import {
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getConversation,
} from '../db/conversations'
import { listMessages } from '../db/messages'
import { getProject } from '../db/projects'
import { getDb } from '../db/connection'
import { UndoService } from './undo-service'
import { skillTracker } from './skill-tracker'
import { ConversationExport, Conversation } from '../../shared/types'

export function listProjectConversations(projectId: string) {
  return listConversations(projectId)
}

export function newConversation(projectId: string) {
  return createConversation(projectId)
}

export function removeConversation(id: string) {
  const conv = getConversation(id)
  if (conv) {
    const project = getProject(conv.projectId)
    if (project) {
      const undo = new UndoService(id, project.path)
      undo.cleanup()
    }
  }
  skillTracker.clear(id)
  deleteConversation(id)
}

export { renameConversation }

export function undoConversationChanges(convId: string): { restored: string[]; message: string } {
  const conv = getConversation(convId)
  if (!conv) throw new Error('Conversation not found')

  const project = getProject(conv.projectId)
  if (!project) throw new Error('Project not found')

  const undo = new UndoService(convId, project.path)
  if (!undo.hasChanges()) {
    return { restored: [], message: 'No changes to undo' }
  }

  const restored = undo.undoAll()
  return { restored, message: `Undid ${restored.length} file changes` }
}

export function buildExportData(convId: string): ConversationExport {
  const conv = getConversation(convId)
  if (!conv) throw new Error('Conversation not found')

  const project = getProject(conv.projectId)
  if (!project) throw new Error('Project not found')

  const messages = listMessages(convId)

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: { name: project.name, path: project.path },
    conversation: {
      title: conv.title,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        reasoningContent: m.reasoningContent,
        toolCalls: m.toolCalls,
        toolCallId: m.toolCallId,
        timestamp: new Date(m.createdAt).toISOString(),
      })),
    },
  }
}

export async function importConversationFromFile(
  projectId: string,
  filePath: string
): Promise<Conversation> {
  const raw = fs.readFileSync(filePath, 'utf-8')

  let data: {
    version?: number
    conversation?: {
      title?: string
      messages?: Array<{
        role: string
        content: string
        reasoningContent?: string
        toolCalls?: unknown
        toolCallId?: string | null
        timestamp?: string
      }>
    }
  }

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (!data.conversation?.messages) {
    throw new Error('Invalid conversation format')
  }

  const conv = createConversation(projectId, data.conversation.title || 'Imported')
  const db = getDb()

  const insert = db.prepare(
    'INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_calls, tool_call_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const { v4: uuidv4 } = await import('uuid')

  const insertMany = db.transaction(() => {
    for (const msg of data.conversation!.messages!) {
      const id = uuidv4()
      insert.run(
        id,
        conv.id,
        msg.role,
        msg.content,
        msg.reasoningContent || '',
        msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
        msg.toolCallId || null,
        msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
      )
    }
  })

  insertMany()
  return conv
}
