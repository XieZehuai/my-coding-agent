import * as fs from 'fs'
import * as path from 'path'

export function searchFiles(projectPath: string, query: string): string[] {
  if (!query || query.length < 1) return []

  const results: string[] = []
  const searchQuery = query.toLowerCase()

  function walk(dir: string, baseDir: string, depth = 0) {
    if (depth > 5 || results.length >= 20) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.agents') continue
      if (entry.name === 'node_modules') continue

      const relativePath = path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, '/')

      if (relativePath.toLowerCase().includes(searchQuery)) {
        results.push(relativePath + (entry.isDirectory() ? '/' : ''))
      }

      if (entry.isDirectory() && depth < 5) {
        walk(path.join(dir, entry.name), baseDir, depth + 1)
      }
    }
  }

  walk(projectPath, projectPath)
  return results.slice(0, 20)
}
