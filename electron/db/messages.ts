import { getDb } from './connection'
import { Message, ToolCall } from '../../shared/types'
import { touchConversation } from './conversations'
import { v4 as uuidv4 } from 'uuid'

export function listMessages(convId: string): Message[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, conv_id as convId, role, content, reasoning_content as reasoningContent,
              tool_calls as toolCalls, tool_call_id as toolCallId, created_at as createdAt
       FROM messages WHERE conv_id = ? ORDER BY created_at ASC`
    )
    .all(convId) as Array<{
      id: string
      convId: string
      role: string
      content: string
      reasoningContent: string
      toolCalls: string | null
      toolCallId: string | null
      createdAt: number
    }>
  return rows.map((row) => ({
    ...row,
    toolCalls: row.toolCalls ? (JSON.parse(row.toolCalls) as ToolCall[]) : null,
    role: row.role as Message['role'],
  }))
}

export function saveUserMessage(convId: string, content: string): Message {
  const db = getDb()
  const id = uuidv4()
  const now = Date.now()
  db.prepare(
    'INSERT INTO messages (id, conv_id, role, content, reasoning_content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, convId, 'user', content, '', now)
  touchConversation(convId)
  return { id, convId, role: 'user', content, reasoningContent: '', toolCalls: null, toolCallId: null, createdAt: now }
}

export function saveAssistantMessage(
  convId: string,
  content: string,
  toolCalls: ToolCall[] | null = null,
  reasoningContent = ''
): Message {
  const db = getDb()
  const id = uuidv4()
  const now = Date.now()
  db.prepare(
    'INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, convId, 'assistant', content, reasoningContent, toolCalls ? JSON.stringify(toolCalls) : null, now)
  touchConversation(convId)
  return { id, convId, role: 'assistant', content, reasoningContent, toolCalls, toolCallId: null, createdAt: now }
}

export function saveToolMessage(
  convId: string,
  content: string,
  toolCallId: string
): Message {
  const db = getDb()
  const id = uuidv4()
  const now = Date.now()
  db.prepare(
    'INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_call_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, convId, 'tool', content, '', toolCallId, now)
  return { id, convId, role: 'tool', content, reasoningContent: '', toolCalls: null, toolCallId, createdAt: now }
}

export function getLastAssistantMessage(convId: string): Message | undefined {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, conv_id as convId, role, content, reasoning_content as reasoningContent,
              tool_calls as toolCalls, tool_call_id as toolCallId, created_at as createdAt
       FROM messages WHERE conv_id = ? AND role = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(convId, 'assistant') as {
      id: string; convId: string; role: string; content: string; reasoningContent: string
      toolCalls: string | null; toolCallId: string | null; createdAt: number
    } | undefined
  if (!row) return undefined
  return {
    ...row,
    toolCalls: row.toolCalls ? (JSON.parse(row.toolCalls) as ToolCall[]) : null,
    role: row.role as Message['role'],
  }
}

export function countMessages(convId: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conv_id = ?').get(convId) as { count: number }
  return row.count
}
