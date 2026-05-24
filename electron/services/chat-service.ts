import * as fs from "fs";
import * as path from "path";
import { getConversation, getConversationTrustMode } from "../db/conversations";
import { getProject } from "../db/projects";
import { saveUserMessage, saveAssistantMessage } from "../db/messages";
import { saveConversationSkill, getConversationSkillNames } from "../db/skills";
import { AgentLoop } from "./agent-service";
import { resolveCommand } from "./command-service";
import { parseSkillReferences, resolveSkill } from "./skill-service";
import { listDirectory } from "./file-service";
import { conversationRegistry } from "./conversation-registry";
import { ConversationRuntime } from "./conversation-runtime";
import { IPC } from "../../shared/types";
import { emitToRenderer } from "../ipc/handlers";

/**
 * Hydrate a freshly-created runtime from DB (skill names + trustMode).
 * Idempotent: safe to call multiple times; only does work on first call.
 *
 * Lives at the service layer, not on the runtime, because runtime stays
 * memory-only (Decision 1: DB IO is service-layer concern).
 */
function warmRuntime(runtime: ConversationRuntime, convId: string): void {
  if (runtime.warmed) return;
  runtime.warmed = true;

  const skillNames = getConversationSkillNames(convId);
  for (const name of skillNames) {
    runtime.addSkill(name);
  }
  runtime.trustMode = getConversationTrustMode(convId);
}

export function parseFileReferences(
  content: string,
  projectPath: string
): { cleanContent: string; fileContents: Map<string, string> } {
  const fileContents = new Map<string, string>();
  const atFileRegex = /@file:([^\s]+)/g;
  let cleanContent = content;
  let match: RegExpExecArray | null;

  while ((match = atFileRegex.exec(content)) !== null) {
    const refPath = match[1];
    try {
      const fullPath = path.resolve(projectPath, refPath);
      if (!fs.existsSync(fullPath)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const listing = listDirectory(fullPath, projectPath);
        fileContents.set(refPath, listing);
      } else if (stat.isFile()) {
        fileContents.set(refPath, fs.readFileSync(fullPath, "utf-8"));
      }
    } catch {
      // ignore unreadable files
    }
  }

  cleanContent = cleanContent.replace(atFileRegex, "").trim();
  if (!cleanContent) cleanContent = content.trim();

  return { cleanContent, fileContents };
}

export function sendChatMessage(convId: string, content: string, trustMode: boolean): void {
  const conv = getConversation(convId);
  if (!conv) throw new Error("Conversation not found");

  const project = getProject(conv.projectId);
  if (!project) throw new Error("Project not found");

  saveUserMessage(convId, content);

  // Lazy-create runtime; persists across sends within this conversation.
  const runtime = conversationRegistry.get(convId);
  // Warm from DB on first access in this app session (skills, trustMode).
  // No-op if already warmed.
  warmRuntime(runtime, convId);

  // Parse #skill references and track new skills (double-write: runtime + DB)
  let contentForProcessing = content;
  const { skillNames } = parseSkillReferences(content);
  if (skillNames.length > 0) {
    contentForProcessing = contentForProcessing
      .replace(/#[a-zA-Z0-9_-]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!contentForProcessing) contentForProcessing = content.trim();
    for (const name of skillNames) {
      const skillContent = resolveSkill(project.path, name);
      if (skillContent) {
        runtime.addSkill(name);
        saveConversationSkill(convId, name);
      }
    }
  }

  // Check for commands
  const cmd = resolveCommand(project.path, contentForProcessing);

  if (cmd?.type === "builtin") {
    // Built-in command: execute and return result directly
    handleBuiltinCommand(convId, cmd.builtinResult!);
    return;
  }

  // Parse @file references for agent messages
  let cleanContent: string;
  let fileContents: Map<string, string>;
  let customPrompt: string | undefined;

  if (cmd?.type === "custom") {
    // Custom command: prepend COMMAND.md instructions
    customPrompt = cmd.customPrompt;
    // Remove the /command prefix, keep user's additional text
    const spaceIdx = content.trim().indexOf(" ");
    const userExtra = spaceIdx > 0 ? content.trim().substring(spaceIdx + 1) : "";
    cleanContent = userExtra || `Execute /${cmd.customName}`;
    fileContents = new Map();
  } else {
    const parsed = parseFileReferences(contentForProcessing, project.path);
    cleanContent = parsed.cleanContent;
    fileContents = parsed.fileContents;
  }

  // Defensive: if a previous loop is still running for this conv, abort it.
  // Normal UI flow disables input while isActive, but this guards races.
  if (runtime.controller) {
    runtime.controller.abort();
  }

  const ac = new AbortController();
  runtime.controller = ac;

  const agent = new AgentLoop(
    {
      convId,
      projectId: conv.projectId,
      projectPath: project.path,
      userContent: cleanContent,
      fileContents,
      signal: ac.signal,
      trustMode,
      customPrompt,
    },
    runtime
  );
  agent
    .start()
    .catch((e) => {
      emitToRenderer(IPC.EVENT_ERROR, { convId, error: (e as Error).message || String(e) });
    })
    .finally(() => {
      // Only clear if this is still the active controller (not replaced by a
      // newer send). Runtime survives across sends.
      if (runtime.controller === ac) {
        runtime.controller = null;
      }
    });
}

export function cancelChat(convId: string): boolean {
  const runtime = conversationRegistry.peek(convId);
  if (!runtime) return false;
  return runtime.abortCurrent();
}

function handleBuiltinCommand(convId: string, result: string) {
  saveAssistantMessage(convId, result, null, "");

  // Emit token events to display result in frontend
  for (const token of result) {
    emitToRenderer(IPC.EVENT_TOKEN, { convId, token });
  }

  emitToRenderer(IPC.EVENT_COMPLETE, { convId });
}
