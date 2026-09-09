import type { AiMessage } from '@backend/ai/types';

export interface ContextLimits {
  readonly maxMessages: number;
  readonly maxCharacters: number;
}

export interface SessionContext {
  readonly sessionId: string;
  readonly messages: readonly AiMessage[];
  readonly currentTask: string | null;
  readonly preferences: Readonly<Record<string, string>>;
}

/**
 * Keeps a bounded conversation window per session. History is trimmed
 * (oldest first) so JARVIS never ships unbounded transcripts to a provider.
 */
export class ContextManager {
  private readonly sessions = new Map<
    string,
    { messages: AiMessage[]; currentTask: string | null; preferences: Record<string, string> }
  >();

  constructor(private readonly limits: ContextLimits) {}

  append(sessionId: string, message: AiMessage): void {
    const session = this.session(sessionId);
    session.messages.push(message);
    this.trim(session.messages);
  }

  setCurrentTask(sessionId: string, task: string | null): void {
    this.session(sessionId).currentTask = task;
  }

  setPreference(sessionId: string, key: string, value: string): void {
    this.session(sessionId).preferences[key] = value;
  }

  get(sessionId: string): SessionContext {
    const session = this.session(sessionId);
    return {
      sessionId,
      messages: [...session.messages],
      currentTask: session.currentTask,
      preferences: { ...session.preferences },
    };
  }

  /** Builds the final message list sent to a provider. */
  buildPrompt(sessionId: string, systemPrompt: string, extra: readonly AiMessage[] = []): AiMessage[] {
    const history = [...this.session(sessionId).messages, ...extra];
    this.trim(history);
    return [{ role: 'system', content: systemPrompt }, ...history];
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private trim(messages: AiMessage[]): void {
    while (messages.length > this.limits.maxMessages) messages.shift();
    let characters = messages.reduce((total, message) => total + message.content.length, 0);
    while (messages.length > 1 && characters > this.limits.maxCharacters) {
      const removed = messages.shift();
      characters -= removed?.content.length ?? 0;
    }
  }

  private session(sessionId: string) {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { messages: [], currentTask: null, preferences: {} };
      this.sessions.set(sessionId, session);
    }
    return session;
  }
}
