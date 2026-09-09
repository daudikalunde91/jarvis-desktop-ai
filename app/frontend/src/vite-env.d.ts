/// <reference types="vite/client" />

export {};

/**
 * Typed surface of the API exposed by the Electron preload script via
 * contextBridge. Kept in sync manually with app/backend/src/preload.ts
 * for Milestone 1 — a generated/shared types package can replace this
 * once the backend and frontend build pipelines are unified.
 */
interface JarvisBridge {
  ping: () => Promise<{ pong: boolean; timestamp: number }>;
  getAppInfo: () => Promise<{ name: string; version: string; description: string }>;
  getConfig: () => Promise<Record<string, unknown>>;
  handleBrain: (request: { utterance: string; sessionId?: string }) => Promise<unknown>;
  getHealth: () => Promise<string>;
  getAiStatus: () => Promise<AiHealthSummary>;
  listAiTools: () => Promise<Array<{ name: string; description: string; risk: string }>>;
}

declare global {
  /** Secret-free AI provider status pushed to the HUD (Milestone 5). */
  interface AiHealthSummary {
    enabled: boolean;
    fallbackEvents: number;
    totalRequests: number;
    providers: Array<{
      id: string;
      label: string;
      state: 'ONLINE' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'AUTH_FAILED' | 'DISABLED' | 'NOT_CONFIGURED';
      model: string;
      cooldownUntilMs: number | null;
      lastErrorCategory: string | null;
      successCount: number;
      failureCount: number;
      averageLatencyMs: number;
    }>;
  }

  interface Window {
    jarvis: JarvisBridge;
  }
}
