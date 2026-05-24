import * as fs from "fs";
import {
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getConversation,
  setConversationTrustMode,
} from "../db/conversations";
import { listMessages } from "../db/messages";
import { getProject } from "../db/projects";
import { getDb } from "../db/connection";
import { getConversationSkillNames, saveConversationSkill } from "../db/skills";
import { UndoService } from "./undo-service";
import { skillTracker } from "./skill-tracker";
import { ConversationExport, Conversation, ToolCall } from "../../shared/types";

export function listProjectConversations(projectId: string) {
  return listConversations(projectId);
}

export function newConversation(projectId: string) {
  return createConversation(projectId);
}

export function removeConversation(id: string) {
  const conv = getConversation(id);
  if (conv) {
    const project = getProject(conv.projectId);
    if (project) {
      const undo = new UndoService(id, project.path);
      undo.cleanup();
    }
  }
  skillTracker.clear(id);
  deleteConversation(id);
}

export { renameConversation };

export function undoConversationChanges(convId: string): { restored: string[]; message: string } {
  const conv = getConversation(convId);
  if (!conv) throw new Error("Conversation not found");

  const project = getProject(conv.projectId);
  if (!project) throw new Error("Project not found");

  const undo = new UndoService(convId, project.path);
  if (!undo.hasChanges()) {
    return { restored: [], message: "No changes to undo" };
  }

  const restored = undo.undoAll();
  return { restored, message: `Undid ${restored.length} file changes` };
}

export function buildExportData(convId: string): ConversationExport {
  const conv = getConversation(convId);
  if (!conv) throw new Error("Conversation not found");

  const project = getProject(conv.projectId);
  if (!project) throw new Error("Project not found");

  const messages = listMessages(convId);
  const skills = getConversationSkillNames(convId);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    project: { name: project.name, path: project.path },
    conversation: {
      title: conv.title,
      trustMode: conv.trustMode ?? false,
      skills: skills.length > 0 ? skills : undefined,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        reasoningContent: m.reasoningContent,
        toolCalls: m.toolCalls,
        toolCallId: m.toolCallId,
        isError: m.isError || undefined,
        timestamp: new Date(m.createdAt).toISOString(),
      })),
    },
  };
}

export async function importConversationFromFile(projectId: string, filePath: string): Promise<Conversation> {
  const raw = fs.readFileSync(filePath, "utf-8");

  let data: {
    version?: number;
    conversation?: {
      title?: string;
      trustMode?: boolean;
      skills?: string[];
      messages?: Array<{
        role: string;
        content: string;
        reasoningContent?: string;
        toolCalls?: unknown;
        toolCallId?: string | null;
        isError?: boolean;
        timestamp?: string;
      }>;
    };
  };

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON file");
  }

  if (!data.conversation?.messages) {
    throw new Error("Invalid conversation format");
  }

  const conv = createConversation(projectId, data.conversation.title || "Imported");

  if (data.conversation.trustMode) {
    setConversationTrustMode(conv.id, true);
  }
  if (data.conversation.skills && data.conversation.skills.length > 0) {
    for (const name of data.conversation.skills) {
      saveConversationSkill(conv.id, name);
    }
  }

  const db = getDb();

  const insert = db.prepare(
    "INSERT INTO messages (id, conv_id, role, content, reasoning_content, tool_calls, tool_call_id, is_error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const { v4: uuidv4 } = await import("uuid");

  const insertMany = db.transaction(() => {
    for (const msg of data.conversation!.messages!) {
      const id = uuidv4();
      const toolCalls = Array.isArray(msg.toolCalls) ? (msg.toolCalls as ToolCall[]) : null;
      const normalizedToolCalls = toolCalls && toolCalls.length > 0 ? toolCalls : null;
      insert.run(
        id,
        conv.id,
        msg.role,
        msg.content,
        msg.reasoningContent || "",
        normalizedToolCalls ? JSON.stringify(normalizedToolCalls) : null,
        msg.toolCallId || null,
        msg.isError ? 1 : 0,
        msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
      );
    }
  });

  insertMany();
  return conv;
}
