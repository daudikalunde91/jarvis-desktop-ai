/**
 * Milestone 5 — AI Brain shared vocabulary.
 *
 * Nothing in this file talks to a specific vendor. Provider adapters map
 * their own wire formats onto these types so the orchestrator, the brain
 * and the UI stay provider-agnostic.
 */

export const AI_TASK_TYPES = [
  'general',
  'coding',
  'multimodal',
  'summarization',
  'planning',
] as const;

export type AiTaskType = (typeof AI_TASK_TYPES)[number];

export interface AiImageAttachment {
  /** Base64 payload without the data-url prefix. */
  readonly base64: string;
  readonly mimeType: string;
}

export interface AiMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
  readonly images?: readonly AiImageAttachment[];
}

export interface AiToolSchema {
  readonly name: string;
  readonly description: string;
  /** JSON-schema-ish parameter description handed to the model. */
  readonly parameters: Record<string, unknown>;
}

export interface AiToolRequest {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface AiCompletionRequest {
  readonly messages: readonly AiMessage[];
  readonly taskType?: AiTaskType;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly tools?: readonly AiToolSchema[];
  readonly signal?: AbortSignal;
  /** Force a provider id (still subject to health + configuration). */
  readonly preferredProviderId?: string;
}

export interface AiUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

export interface AiCompletionResult {
  readonly text: string;
  readonly providerId: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly usage?: AiUsage;
  readonly toolRequests?: readonly AiToolRequest[];
  /** Providers attempted (in order) before this result was produced. */
  readonly attempted: readonly string[];
}

export interface ProviderCapabilities {
  readonly reasoning: boolean;
  readonly coding: boolean;
  readonly vision: boolean;
  readonly toolCalling: boolean;
  readonly streaming: boolean;
}

export type ProviderState =
  | 'ONLINE'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'AUTH_FAILED'
  | 'DISABLED'
  | 'NOT_CONFIGURED';

export interface ProviderStatusSnapshot {
  readonly id: string;
  readonly label: string;
  readonly state: ProviderState;
  readonly model: string;
  readonly cooldownUntilMs: number | null;
  readonly lastErrorCategory: string | null;
  readonly successCount: number;
  readonly failureCount: number;
  readonly averageLatencyMs: number;
}

export interface AiHealthSummary {
  readonly enabled: boolean;
  readonly providers: readonly ProviderStatusSnapshot[];
  readonly fallbackEvents: number;
  readonly totalRequests: number;
}
