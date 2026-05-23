import type { Message, ToolCall } from '@shared/types'

export type { Message, ToolCall }

export interface AskInfo {
  askId: string
  toolName: string
  detail: string
}
