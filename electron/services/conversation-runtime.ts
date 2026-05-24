import { AgentState, ToolLogEntry } from "../../shared/types";
import { TOKEN_LIMIT } from "./agent-shared";
import type { AgentStatusSnapshot } from "./agent-shared";

export interface TrackedSkill {
  name: string;
  content: string;
}

type SkillResolver = (projectPath: string, skillName: string) => string | null;

type AskResolver = (approved: boolean) => void;

function defaultStatus(convId: string): AgentStatusSnapshot {
  return {
    convId,
    state: "idle" as AgentState,
    round: 0,
    maxTurns: 50,
    tokenCount: 0,
    tokenLimit: TOKEN_LIMIT,
    tokenPercent: 0,
    toolLogs: [] as ToolLogEntry[],
    lastCompression: null,
  };
}

/**
 * Per-conversation, in-memory runtime container.
 *
 * Owns ephemeral state for a single conversation:
 *   - the active AbortController for the in-flight agent loop (if any)
 *   - the latest status snapshot
 *   - pending permission ask resolvers (keyed by askId, scoped to this conv)
 *   - tracked skills cache (lazily resolved from disk)
 *   - in-memory trustMode mirror (DB column is source of truth; this mirror
 *     allows mid-run trust toggles to be picked up without per-tool DB reads)
 *
 * The runtime performs NO database writes. The service layer is responsible
 * for the "double write" pattern: when a piece of state has DB persistence
 * (trustMode, skills), the service layer writes both the runtime AND the DB
 * at a single call-site.
 *
 * Lifecycle: lazily created by ConversationRegistry on first access.
 * Disposed when the conversation is deleted or the app quits. Disposal
 * aborts the active controller, rejects all pending asks, and clears caches.
 */
export class ConversationRuntime {
  readonly convId: string;

  controller: AbortController | null = null;
  status: AgentStatusSnapshot;
  trustMode = false;
  skills: TrackedSkill[] = [];

  /**
   * `true` once the service layer has hydrated this runtime from DB
   * (skill names, trustMode). New runtimes are born `false`; the service
   * layer must check and warm before the first agent loop reads from it.
   *
   * This flag is set by the service layer, not by the runtime itself,
   * because warming requires DB access and runtime stays memory-only
   * (Decision 1).
   */
  warmed = false;

  private pendingAsks = new Map<string, AskResolver>();
  private disposed = false;

  constructor(convId: string) {
    this.convId = convId;
    this.status = defaultStatus(convId);
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.controller) {
      try {
        this.controller.abort();
      } catch {
        // ignore — controller may already be aborted
      }
      this.controller = null;
    }

    this.rejectAllAsks();
    this.skills.length = 0;
  }

  // ─── Run control ──────────────────────────────────────────────

  abortCurrent(): boolean {
    if (this.controller) {
      this.controller.abort();
      return true;
    }
    return false;
  }

  // ─── Permission asks ─────────────────────────────────────────

  registerAsk(askId: string, resolve: AskResolver): void {
    if (this.disposed) {
      // dispose race: settle immediately as denied
      try {
        resolve(false);
      } catch {
        // ignore
      }
      return;
    }
    this.pendingAsks.set(askId, resolve);
  }

  resolveAsk(askId: string, approved: boolean): boolean {
    const resolver = this.pendingAsks.get(askId);
    if (!resolver) return false;
    this.pendingAsks.delete(askId);
    try {
      resolver(approved);
    } catch {
      // ignore — never let a misbehaving resolver bubble up
    }
    return true;
  }

  rejectAllAsks(): void {
    if (this.pendingAsks.size === 0) return;
    const resolvers = Array.from(this.pendingAsks.values());
    this.pendingAsks.clear();
    for (const resolve of resolvers) {
      try {
        resolve(false);
      } catch {
        // ignore
      }
    }
  }

  // ─── Status ───────────────────────────────────────────────────

  updateStatus(snapshot: AgentStatusSnapshot): void {
    this.status = snapshot;
  }

  // ─── Skills ───────────────────────────────────────────────────

  addSkill(name: string): void {
    if (this.skills.some((s) => s.name === name)) return;
    this.skills.push({ name, content: "" });
  }

  setSkillsCache(skills: TrackedSkill[]): void {
    this.skills = skills.map((s) => ({ ...s }));
  }

  /**
   * Returns tracked skills with their content lazily resolved on first access.
   * Receives `resolveSkill` as a parameter so the runtime stays free of
   * `skill-service` imports (testable in isolation).
   */
  getSkillsContent(projectPath: string, resolveSkill: SkillResolver): TrackedSkill[] {
    for (const s of this.skills) {
      if (!s.content) {
        const content = resolveSkill(projectPath, s.name);
        s.content = content || "";
      }
    }
    return this.skills;
  }

  clearSkills(): void {
    this.skills.length = 0;
  }
}
