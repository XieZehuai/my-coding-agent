import * as fs from 'fs'
import * as path from 'path'
import { globSync } from 'glob'

function resolvePath(projectPath: string, filePath: string): string {
  const resolved = path.resolve(projectPath, filePath)
  if (!resolved.startsWith(path.resolve(projectPath))) {
    throw new Error(`Access denied: path "${filePath}" is outside project root`)
  }
  return resolved
}

async function readFile(args: Record<string, unknown>, projectPath: string): Promise<string> {
  const filePath = args.path as string
  const resolved = resolvePath(projectPath, filePath)

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = fs.readFileSync(resolved, 'utf-8')
  const lines = content.split('\n')

  const startLine = (args.start_line as number) || 1
  const endLine = (args.start_line as number) ? ((args.end_line as number) || lines.length) : lines.length

  return lines.slice(startLine - 1, endLine).join('\n')
}

async function writeFile(
  args: Record<string, unknown>,
  projectPath: string,
  onBackup?: (filePath: string) => void
): Promise<string> {
  const filePath = args.path as string
  const content = args.content as string
  const resolved = resolvePath(projectPath, filePath)

  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (onBackup) {
    onBackup(filePath)
  }

  fs.writeFileSync(resolved, content, 'utf-8')
  return `Successfully wrote ${content.length} characters to ${filePath}`
}

async function listDirectory(args: Record<string, unknown>, projectPath: string): Promise<string> {
  const dirPath = (args.path as string) || '.'
  const resolved = resolvePath(projectPath, dirPath)

  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${dirPath}`)
  }

  const stat = fs.statSync(resolved)
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`)
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true })
  const lines: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.agents') continue
    const prefix = entry.isDirectory() ? '📁' : '📄'
    lines.push(`${prefix} ${entry.name}`)
  }

  return lines.join('\n')
}

async function globSearch(args: Record<string, unknown>, projectPath: string): Promise<string> {
  const pattern = args.pattern as string
  const resolvedPattern = path.resolve(projectPath, pattern).replace(/\\/g, '/')

  try {
    const files = globSync(resolvedPattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.agents/backups/**'],
      nodir: true,
    })

    if (files.length === 0) {
      return `No files matching pattern: ${pattern}`
    }

    const relative = files.map((f) => path.relative(projectPath, f).replace(/\\/g, '/'))
    return relative.slice(0, 100).join('\n') + (relative.length > 100 ? `\n... and ${relative.length - 100} more files` : '')
  } catch (e) {
    throw new Error(`Glob search failed: ${(e as Error).message}`)
  }
}

async function grepSearch(args: Record<string, unknown>, projectPath: string): Promise<string> {
  const pattern = args.pattern as string
  let regex: RegExp

  try {
    regex = new RegExp(pattern, 'g')
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${pattern}`)
  }

  const results: string[] = []
  const walkDir = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.isFile()) {
        // Skip binary files
        const ext = path.extname(entry.name).toLowerCase()
        if (['.exe', '.dll', '.png', '.jpg', '.ico', '.bin', '.zip'].includes(ext)) continue

        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const lines = content.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const relPath = path.relative(projectPath, fullPath).replace(/\\/g, '/')
              results.push(`${relPath}:${i + 1}: ${lines[i].trim().substring(0, 200)}`)
              regex.lastIndex = 0
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walkDir(projectPath)

  if (results.length === 0) {
    return `No matches found for pattern: ${pattern}`
  }

  return results.slice(0, 50).join('\n') + (results.length > 50 ? `\n... and ${results.length - 50} more matches` : '')
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  projectPath: string,
  onBackup?: (filePath: string) => void
): Promise<string> {
  switch (toolName) {
    case 'read_file':
      return readFile(args, projectPath)
    case 'write_file':
      return writeFile(args, projectPath, onBackup)
    case 'list_directory':
      return listDirectory(args, projectPath)
    case 'glob_search':
      return globSearch(args, projectPath)
    case 'grep_search':
      return grepSearch(args, projectPath)
    default:
      throw new Error(`Unknown file tool: ${toolName}`)
  }
}
