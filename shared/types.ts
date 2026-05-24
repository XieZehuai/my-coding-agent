// ============================================================
// Core Data Types
// ============================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  convId: string;
  role: MessageRole;
  content: string;
  reasoningContent: string;
  toolCalls: ToolCall[] | null;
  toolCallId: string | null;
  isError: boolean;
  createdAt: number;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  trustMode?: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Tool / Function Calling
// ============================================================

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  error?: string;
}

// ============================================================
// Agent Status
// ============================================================

export type AgentState =
  | "idle"
  | "compressing"
  | "streaming"
  | "executing_tools"
  | "waiting_user"
  | "completed"
  | "cancelled"
  | "error";

export interface AgentStatus {
  convId: string;
  state: AgentState;
  round: number;
  maxTurns: number;
  tokenCount: number;
  tokenLimit: number;
  tokenPercent: number;
  lastCompression: number | null;
  toolLogs: ToolLogEntry[];
}

export interface ToolLogEntry {
  timestamp: number;
  toolName: string;
  target: string;
  duration: number;
  status: "success" | "error" | "timeout";
  error?: string;
}

// ============================================================
// Permission
// ============================================================

export type PermissionLevel = "always" | "ask" | "deny";

export interface PermissionConfig {
  read: PermissionLevel;
  write: PermissionLevel;
  execute: PermissionLevel;
}

export interface PermissionAsk {
  askId: string;
  convId: string;
  toolName: string;
  detail: string;
}

// ============================================================
// Config
// ============================================================

export interface AppConfig {
  api: ApiConfig;
  permissions: PermissionConfig;
  maxTurns: number;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  retry: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  api: {
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    model: "deepseek-chat",
    retry: 3,
  },
  permissions: {
    read: "always",
    write: "ask",
    execute: "ask",
  },
  maxTurns: 50,
};

// ============================================================
// Export / Import
// ============================================================

export interface ConversationExport {
  version: 1 | 2;
  exportedAt: string;
  project: {
    name: string;
    path: string;
  };
  conversation: {
    title: string;
    trustMode?: boolean;
    skills?: string[];
    messages: ExportMessage[];
  };
}

export interface ExportMessage {
  role: MessageRole;
  content: string;
  reasoningContent: string;
  toolCalls: ToolCall[] | null;
  toolCallId: string | null;
  isError?: boolean;
  timestamp: string;
}

// ============================================================
// IPC Channel Names
// ============================================================

export const IPC = {
  // Project
  PROJECT_LIST: "project:list",
  PROJECT_ADD: "project:add",
  PROJECT_REMOVE: "project:remove",

  // Conversation
  CONV_LIST: "conversation:list",
  CONV_CREATE: "conversation:create",
  CONV_DELETE: "conversation:delete",
  CONV_RENAME: "conversation:rename",
  CONV_UNDO: "conversation:undo",
  CONV_EXPORT: "conversation:export",
  CONV_IMPORT: "conversation:import",

  // Message
  MESSAGE_LIST: "message:list",

  // Chat
  CHAT_SEND: "chat:send",
  CHAT_CANCEL: "chat:cancel",

  // Agent
  AGENT_CONFIRM: "agent:confirm", // payload: (convId, askId, approved)
  AGENT_STATUS: "agent:status",
  AGENT_SET_TRUST: "agent:set-trust",

  // File
  FILE_SEARCH: "file:search",
  COMMAND_SEARCH: "command:search",
  SKILL_SEARCH: "skill:search",

  // Config
  CONFIG_READ: "config:read",

  // Events (Main → Renderer)
  EVENT_TOKEN: "agent:token",
  EVENT_REASONING: "agent:reasoning",
  EVENT_TOOL_START: "agent:tool-start",
  EVENT_TOOL_END: "agent:tool-end",
  EVENT_TOOL_ERROR: "agent:tool-error",
  EVENT_ASK: "agent:ask",
  EVENT_COMPLETE: "agent:complete",
  EVENT_CANCELLED: "agent:cancelled",
  EVENT_ERROR: "agent:error",
  EVENT_STATUS: "agent:status",
  EVENT_TITLE_GENERATED: "agent:title-generated",
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
