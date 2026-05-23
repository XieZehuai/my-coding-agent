import * as fs from 'fs'
import * as path from 'path'
import { getConversation } from '../db/conversations'
import { getProject } from '../db/projects'
import { saveUserMessage, saveAssistantMessage } from '../db/messages'
import { runAgentLoop } from './agent-service'
import { resolveCommand } from './command-service'
import { emitToRenderer } from '../ipc/handlers'

const agentControllers = new Map<string, AbortController>()

export function parseFileReferences(
  content: string,
  projectPath: string
): { cleanContent: string; fileContents: Map<string, string> } {
  const fileContents = new Map<string, string>()
  const atFileRegex = /@file:([^\s]+)/g
  let cleanContent = content
  let match: RegExpExecArray | null

  while ((match = atFileRegex.exec(content)) !== null) {
    const filePath = match[1]
    try {
      const fullPath = path.resolve(projectPath, filePath)
      if (fs.existsSync(fullPath)) {
        fileContents.set(filePath, fs.readFileSync(fullPath, 'utf-8'))
      }
    } catch {
      // ignore unreadable files
    }
  }

  cleanContent = cleanContent.replace(atFileRegex, '').trim()
  if (!cleanContent) cleanContent = content.trim()

  return { cleanContent, fileContents }
}

export function sendChatMessage(
  convId: string,
  content: string,
  trustMode: boolean
): void {
  const conv = getConversation(convId)
  if (!conv) throw new Error('Conversation not found')

  const project = getProject(conv.projectId)
  if (!project) throw new Error('Project not found')

  saveUserMessage(convId, content)

  // Check for commands
  const cmd = resolveCommand(project.path, content)

  if (cmd?.type === 'builtin') {
    // Built-in command: execute and return result directly
    handleBuiltinCommand(convId, cmd.builtinResult!)
    return
  }

  // Parse @file references for agent messages
  let cleanContent: string
  let fileContents: Map<string, string>
  let customPrompt: string | undefined

  if (cmd?.type === 'custom') {
    // Custom command: prepend COMMAND.md instructions
    customPrompt = cmd.customPrompt
    // Remove the /command prefix, keep user's additional text
    const spaceIdx = content.trim().indexOf(' ')
    const userExtra = spaceIdx > 0 ? content.trim().substring(spaceIdx + 1) : ''
    cleanContent = userExtra || `Execute /${cmd.customName}`
    fileContents = new Map()
  } else {
    const parsed = parseFileReferences(content, project.path)
    cleanContent = parsed.cleanContent
    fileContents = parsed.fileContents
  }

  const ac = new AbortController()
  agentControllers.set(convId, ac)

  runAgentLoop({
    convId,
    projectId: conv.projectId,
    projectPath: project.path,
    userContent: cleanContent,
    fileContents,
    signal: ac.signal,
    trustMode,
    customPrompt,
  }).finally(() => {
    agentControllers.delete(convId)
  })
}

export function cancelChat(convId: string): boolean {
  const ac = agentControllers.get(convId)
  if (ac) {
    ac.abort()
    agentControllers.delete(convId)
    return true
  }
  return false
}

function handleBuiltinCommand(convId: string, result: string) {
  saveAssistantMessage(convId, result, null, '')

  // Emit token events to display result in frontend
  for (const token of result) {
    emitToRenderer('agent:token', { convId, token })
  }

  emitToRenderer('agent:complete', { convId })
}
