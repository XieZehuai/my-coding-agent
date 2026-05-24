import { getDb } from "./connection";
import { Message, ToolCall } from "../../shared/types";
import { touchConversation } from "./conversations";
import { v4 as uuidv4 } from "uuid";

function parseStoredToolCalls(value: string | null): ToolCall[] | null {
  if (!value) return null;
  const toolCalls = JSON.parse(value) as ToolCall[];
  return toolCalls.length > 0 ? toolCalls : null;
}

function normalizeToolCalls(toolCalls: ToolCall[] | null): ToolCall[] | null {
  return toolCalls && toolCalls.length > 0 ? toolCalls : null;
}

interface RawMessageRow {
  id: string;
  convId: string;
  role: string;
  content: string;
  reasoningContent: string;
  toolCalls: string | null;
  toolCallId: string | null;
  isError: number;
  createdAt: number;
}

function rowToMessage(row: RawMessageRow): Message {
  return {
    id: row.id,
    convId: row.convId,
    role: row.role as Message["role"],
    content: row.content,
    reasoningContent: row.reasoningContent,
    toolCalls: parseStoredToolCalls(row.toolCalls),
    toolCallId: row.toolCallId,
    isError: row.isError === 1,
    createdAt: row.createdAt,
  };
}

const MESSAGE_COLUMNS = `id, conv_id as convId, role, content, reasoning_content as reasoningContent,
              tool_calls as toolCalls, tool_call_id as toolCallId, is_error as isError, created_at as createdAt`;

export function listMessages(convId: string): Message[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT ${MESSAGE_COLUMNS} FROM messages WHERE conv_id = ? ORDER BY created_at ASC`)
    .all(convId) as RawMessageRow[];
  return rows.map(rowToMessage);
}

export function saveUserMessage(convId: string, content: string): Message {
  const db = getDb();
  const id = uuidv4();
  const now = Date.now();
  db.prepare(
    "INSERT INTO messages (id, conv_id, role, content, reasoning_content, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, convId, "user", content, "", now);
  touchConversation(convId);
  return {
    id,
    convId,
    role: "user",
    content,
    reasoningContent: "",
    toolCalls: null,
    toolCallId: null,
    isError: false,
    createdAt: now,
  };
}

export function saveAssistantMessage(
  convId: string,
  content: string,
  toolCalls: ToolCall[] | null = null,
  reasoningContent = ""
): Message {
  const db = getDb();
  const id = uuidv4();
  const now = Date.now();
  const normalizedToolCalls = normalizeToolCalls(toolCalls);
  db.prepare(
    "INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    convId,
    "assistant",
    content,
    reasoningContent,
    normalizedToolCalls ? JSON.stringify(normalizedToolCalls) : null,
    now
  );
  touchConversation(convId);
  return {
    id,
    convId,
    role: "assistant",
    content,
    reasoningContent,
    toolCalls: normalizedToolCalls,
    toolCallId: null,
    isError: false,
    createdAt: now,
  };
}

export function saveToolMessage(convId: string, content: string, toolCallId: string, isError = false): Message {
  const db = getDb();
  const id = uuidv4();
  const now = Date.now();
  db.prepare(
    "INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_call_id, is_error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, convId, "tool", content, "", toolCallId, isError ? 1 : 0, now);
  return {
    id,
    convId,
    role: "tool",
    content,
    reasoningContent: "",
    toolCalls: null,
    toolCallId,
    isError,
    createdAt: now,
  };
}

export function getLastAssistantMessage(convId: string): Message | undefined {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${MESSAGE_COLUMNS} FROM messages WHERE conv_id = ? AND role = ? ORDER BY created_at DESC LIMIT 1`)
    .get(convId, "assistant") as RawMessageRow | undefined;
  if (!row) return undefined;
  return rowToMessage(row);
}

export function countMessages(convId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM messages WHERE conv_id = ?").get(convId) as { count: number };
  return row.count;
}
