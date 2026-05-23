import { getDb } from './connection'
import { Conversation } from '../../shared/types'
import { touchProject } from './projects'
import { v4 as uuidv4 } from 'uuid'

export function listConversations(projectId: string): Conversation[] {
  const db = getDb()
  return db
    .prepare('SELECT id, project_id as projectId, title, created_at as createdAt, updated_at as updatedAt FROM conversations WHERE project_id = ? ORDER BY updated_at DESC')
    .all(projectId) as Conversation[]
}

export function createConversation(projectId: string, title = '未命名'): Conversation {
  const db = getDb()
  const id = uuidv4()
  const now = Date.now()
  db.prepare(
    'INSERT INTO conversations (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, projectId, title, now, now)
  touchProject(projectId)
  return { id, projectId, title, createdAt: now, updatedAt: now }
}

export function deleteConversation(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

export function renameConversation(id: string, title: string): void {
  const db = getDb()
  db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, Date.now(), id)
}

export function getConversation(id: string): Conversation | undefined {
  const db = getDb()
  return db
    .prepare('SELECT id, project_id as projectId, title, created_at as createdAt, updated_at as updatedAt FROM conversations WHERE id = ?')
    .get(id) as Conversation | undefined
}

export function touchConversation(id: string): void {
  const db = getDb()
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(Date.now(), id)
}
