import { ConversationRuntime } from "./conversation-runtime";

/**
 * Singleton registry of ConversationRuntime instances.
 *
 * - `get(convId)` lazily creates a runtime if absent. Existence in DB is
 *   not validated here; callers (IPC handlers) validate upstream via
 *   `getConversation(convId)`.
 * - `dispose(convId)` aborts in-flight work, rejects pending asks, clears
 *   caches, and removes the runtime from the registry.
 * - `disposeAll()` is called once on `before-quit`.
 */
class ConversationRegistry {
  private runtimes = new Map<string, ConversationRuntime>();

  get(convId: string): ConversationRuntime {
    let runtime = this.runtimes.get(convId);
    if (!runtime) {
      runtime = new ConversationRuntime(convId);
      this.runtimes.set(convId, runtime);
    }
    return runtime;
  }

  peek(convId: string): ConversationRuntime | undefined {
    return this.runtimes.get(convId);
  }

  dispose(convId: string): void {
    const runtime = this.runtimes.get(convId);
    if (!runtime) return;
    if (runtime.controller) {
      // Race indicator: disposing while a loop is active. Loop will see
      // its signal abort and unwind cleanly; this warn surfaces the timing.
      console.warn(`[ConversationRegistry] Disposing runtime for ${convId} while controller is active`);
    }
    runtime.dispose();
    this.runtimes.delete(convId);
  }

  disposeAll(): void {
    for (const runtime of this.runtimes.values()) {
      runtime.dispose();
    }
    this.runtimes.clear();
  }
}

export const conversationRegistry = new ConversationRegistry();
