import { getDb } from './connection'
import { Project } from '../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function listProjects(): Project[] {
  const db = getDb()
  return db
    .prepare('SELECT id, name, path, created_at as createdAt, updated_at as updatedAt FROM projects ORDER BY updated_at DESC')
    .all() as Project[]
}

export function addProject(name: string, path: string): Project {
  const db = getDb()
  const id = uuidv4()
  const now = Date.now()
  db.prepare(
    'INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, path, now, now)
  return { id, name, path, createdAt: now, updatedAt: now }
}

export function removeProject(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function getProject(id: string): Project | undefined {
  const db = getDb()
  return db
    .prepare('SELECT id, name, path, created_at as createdAt, updated_at as updatedAt FROM projects WHERE id = ?')
    .get(id) as Project | undefined
}

export function getProjectByPath(path: string): Project | undefined {
  const db = getDb()
  return db
    .prepare('SELECT id, name, path, created_at as createdAt, updated_at as updatedAt FROM projects WHERE path = ?')
    .get(path) as Project | undefined
}

export function touchProject(id: string): void {
  const db = getDb()
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), id)
}
