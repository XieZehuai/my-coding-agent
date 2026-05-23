import { ChatMessage } from '../api/openai-client'
import { Message } from '../../shared/types'
import * as fs from 'fs'
import * as path from 'path'

export const SYSTEM_PROMPT = `You are Coding Agent, an AI assistant for software development on Windows.

You help users by analyzing code, making modifications, running commands, and reviewing code. You work within a project directory that the user has opened.

## Available Tools
- read_file: Read content from a file
- write_file: Write content to a file (creates if not exists)
- list_directory: List directory contents
- glob_search: Find files matching a glob pattern
- grep_search: Search file contents with regex
- run_command: Execute a shell command via PowerShell
- git_status: Show git working tree status
- git_diff: Show git working tree diff

## Workflow
1. Understand the user's request thoroughly before acting
2. Explore the project structure to understand the codebase
3. Read relevant files before making changes
4. Make changes with write_file
5. Verify changes when appropriate

## Guidelines
- Always read files before modifying them
- Write complete, working code - never use placeholder comments
- Follow existing code conventions and patterns in the project
- When the task is complete, summarize what you did
- Use Chinese to communicate with the user`

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function buildInitialMessages(
  userContent: string,
  history: Message[],
  projectPath: string,
  fileContents: Map<string, string>
): ChatMessage[] {
  const messages: ChatMessage[] = []

  messages.push({ role: 'system', content: getSystemPromptWithContext(projectPath) })

  if (fileContents.size > 0) {
    const fileContext = Array.from(fileContents.entries())
      .map(([f, c]) => `### File: ${f}\n\`\`\`\n${c}\n\`\`\``)
      .join('\n\n')
    messages.push({ role: 'user', content: `Referenced files:\n${fileContext}` })
    messages.push({ role: 'assistant', content: 'I have read the referenced files.' })
  }

  for (const msg of history) {
    messages.push({
      role: msg.role as ChatMessage['role'],
      content: msg.content,
      reasoning_content: msg.reasoningContent || undefined,
      tool_calls: msg.toolCalls || undefined,
      tool_call_id: msg.toolCallId || undefined,
    })
  }

  messages.push({ role: 'user', content: userContent })

  return messages
}

function getSystemPromptWithContext(projectPath: string): string {
  let prompt = SYSTEM_PROMPT

  try {
    const structure = getProjectStructure(projectPath, 2)
    prompt += `\n\n## Current Project\nProject path: ${projectPath}\n\nProject structure:\n\`\`\`\n${structure}\n\`\`\``
  } catch {
    // ignore
  }

  return prompt
}

function getProjectStructure(dir: string, maxDepth: number, depth = 0, prefix = ''): string {
  if (depth > maxDepth) return ''

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') || e.name === '.agents')
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

  let result = ''
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const isLast = i === entries.length - 1
    const connector = isLast ? '└── ' : '├── '
    const newPrefix = prefix + (isLast ? '    ' : '│   ')

    result += `${prefix}${connector}${entry.name}\n`
    if (entry.isDirectory()) {
      result += getProjectStructure(path.join(dir, entry.name), maxDepth, depth + 1, newPrefix)
    }
  }

  return result
}

export function countTokens(messages: ChatMessage[]): number {
  let total = 0
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    if (msg.tool_calls) {
      const tcStr = JSON.stringify(msg.tool_calls)
      total += estimateTokens(tcStr)
    }
  }
  return total
}

export function compressContext(
  messages: ChatMessage[],
  summary: string
): ChatMessage[] {
  const systemMsg = messages.find((m) => m.role === 'system')
  const recentMessages: ChatMessage[] = []

  let turnCount = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') turnCount++
    if (turnCount > 5) break
    recentMessages.unshift(msg)
  }

  const compressed: ChatMessage[] = []
  if (systemMsg) {
    compressed.push(systemMsg)
  }

  compressed.push({
    role: 'system',
    content: `<memory>\nPrevious conversation summary:\n${summary}\n</memory>`,
  })

  compressed.push(...recentMessages)

  return compressed
}

export function hasAssistantResponse(messages: Message[]): boolean {
  return messages.some((m) => m.role === 'assistant' && m.content && m.content.length > 0)
}
