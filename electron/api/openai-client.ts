import { ToolDefinition, ToolCall } from '../../shared/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  reasoning_content?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onReasoning: (token: string) => void
  onToolCalls: (toolCalls: ToolCall[]) => void
  onComplete: (content: string, reasoningContent: string) => void
  onError: (error: Error) => void
}

export interface ChatOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  retry?: number
  signal?: AbortSignal
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class OpenAIClient {
  async chat(options: ChatOptions): Promise<{ content: string; toolCalls: ToolCall[]; reasoningContent: string }> {
    const { baseUrl, apiKey, model, messages, tools, retry = 3, signal } = options
    const maxRetries = Math.min(Math.max(retry, 0), 5)
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (signal?.aborted) {
          throw new Error('Request cancelled')
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            tools: tools && tools.length > 0 ? tools : undefined,
            stream: false,
            temperature: 0,
          }),
          signal,
        })

        if (!response.ok) {
          const status = response.status
          if (status === 429 || status >= 500) {
            lastError = new Error(`API error: ${status} ${response.statusText}`)
            if (attempt < maxRetries) {
              const backoff = Math.min(1000 * Math.pow(2, attempt), 16000)
              await sleep(backoff)
              continue
            }
          }
          const body = await response.text()
          throw new Error(`API error ${status}: ${body}`)
        }

        const data = await response.json() as {
          choices: Array<{
            message: {
              content: string | null
              reasoning_content?: string
              tool_calls?: Array<{
                id: string
                type: 'function'
                function: { name: string; arguments: string }
              }>
            }
          }>
        }

        const choice = data.choices?.[0]
        if (!choice) {
          throw new Error('No response from API')
        }

        return {
          content: choice.message.content || '',
          toolCalls: choice.message.tool_calls || [],
          reasoningContent: choice.message.reasoning_content || '',
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          throw new Error('Request cancelled')
        }
        lastError = e as Error
        if (attempt < maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 16000)
          await sleep(backoff)
          continue
        }
      }
    }

    throw lastError || new Error('API request failed')
  }

  async chatStream(options: ChatOptions, callbacks: StreamCallbacks): Promise<void> {
    const { baseUrl, apiKey, model, messages, tools, retry = 3, signal } = options
    const maxRetries = Math.min(Math.max(retry, 0), 5)
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (signal?.aborted) {
          callbacks.onError(new Error('Request cancelled'))
          return
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            tools: tools && tools.length > 0 ? tools : undefined,
            stream: true,
            temperature: 0,
          }),
          signal,
        })

        if (!response.ok) {
          const status = response.status
          if (status === 429 || status >= 500) {
            lastError = new Error(`API error: ${status}`)
            if (attempt < maxRetries) {
              const backoff = Math.min(1000 * Math.pow(2, attempt), 16000)
              await sleep(backoff)
              continue
            }
          }
          const body = await response.text()
          callbacks.onError(new Error(`API error ${status}: ${body}`))
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          callbacks.onError(new Error('No response body'))
          return
        }

        const decoder = new TextDecoder()
        let fullContent = ''
        let fullReasoning = ''
        const toolCallsAccumulator = new Map<number, ToolCall>()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue
            const dataStr = trimmed.slice(6)
            if (dataStr === '[DONE]') continue

            try {
              const chunk = JSON.parse(dataStr) as {
                choices?: Array<{
                  delta?: {
                    content?: string
                    reasoning_content?: string
                    tool_calls?: Array<{
                      index?: number
                      id?: string
                      type?: 'function'
                      function?: { name?: string; arguments?: string }
                    }>
                  }
                  finish_reason?: string | null
                }>
              }

              const delta = chunk.choices?.[0]?.delta
              if (!delta) continue

              if (delta.reasoning_content) {
                fullReasoning += delta.reasoning_content
                callbacks.onReasoning(delta.reasoning_content)
              }

              if (delta.content) {
                fullContent += delta.content
                callbacks.onToken(delta.content)
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0
                  if (!toolCallsAccumulator.has(idx)) {
                    toolCallsAccumulator.set(idx, {
                      id: tc.id || '',
                      type: 'function',
                      function: {
                        name: tc.function?.name || '',
                        arguments: '',
                      },
                    })
                  }
                  const existing = toolCallsAccumulator.get(idx)!
                  if (tc.id) existing.id = tc.id
                  if (tc.function?.name) existing.function.name = tc.function.name
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
                }
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }

        const toolCalls = Array.from(toolCallsAccumulator.values())
        if (toolCalls.length > 0) {
          callbacks.onToolCalls(toolCalls)
        }
        callbacks.onComplete(fullContent, fullReasoning)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          callbacks.onError(new Error('Request cancelled'))
          return
        }
        lastError = e as Error
        if (attempt < maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 16000)
          await sleep(backoff)
          continue
        }
      }
    }

    callbacks.onError(lastError || new Error('API request failed'))
  }
}
