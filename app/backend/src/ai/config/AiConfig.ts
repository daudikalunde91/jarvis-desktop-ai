import type { AiTaskType } from '@backend/ai/types';

/**
 * All AI configuration lives here. No model id is hardcoded anywhere else
 * in the codebase, and no API key ever leaves the main process.
 */

export interface ProviderConfig {
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly model: string;
  readonly visionModel?: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

export interface AiConfig {
  /** Master switch — false keeps JARVIS entirely offline. */
  readonly enabled: boolean;
  readonly maxContextMessages: number;
  readonly maxContextCharacters: number;
  readonly providers: {
    readonly openai: ProviderConfig;
    readonly gemini: ProviderConfig;
    readonly claude: ProviderConfig;
    readonly local: ProviderConfig;
  };
  /** Ordered provider ids per task type. First eligible one wins. */
  readonly priorities: Record<AiTaskType, readonly string[]>;
}

export const DEFAULT_PRIORITIES: Record<AiTaskType, readonly string[]> = {
  general: ['openai', 'gemini', 'claude', 'local'],
  coding: ['claude', 'openai', 'gemini', 'local'],
  multimodal: ['gemini', 'openai', 'claude', 'local'],
  summarization: ['gemini', 'openai', 'claude', 'local'],
  planning: ['openai', 'claude', 'gemini', 'local'],
};

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  claude: 'claude-3-5-sonnet-latest',
  local: 'local',
} as const;

export const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  claude: 'https://api.anthropic.com/v1',
  local: 'http://127.0.0.1:11434/v1',
} as const;

export interface AiEnvInput {
  readonly aiEnabled?: boolean;
  readonly aiTimeoutMs?: number;
  readonly aiMaxContextMessages?: number;
  readonly aiMaxContextCharacters?: number;
  readonly aiPriorityGeneral?: string[];
  readonly aiPriorityCoding?: string[];
  readonly aiPriorityMultimodal?: string[];
  readonly openaiApiKey?: string;
  readonly openaiModel?: string;
  readonly openaiBaseUrl?: string;
  readonly openaiEnabled?: boolean;
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly geminiBaseUrl?: string;
  readonly geminiEnabled?: boolean;
  readonly anthropicApiKey?: string;
  readonly anthropicModel?: string;
  readonly anthropicBaseUrl?: string;
  readonly anthropicEnabled?: boolean;
  readonly localAiEnabled?: boolean;
  readonly localAiBaseUrl?: string;
  readonly localAiModel?: string;
  readonly localAiApiKey?: string;
}

/** Builds the AI configuration from already-validated environment values. */
export function buildAiConfig(env: AiEnvInput = {}): AiConfig {
  const timeoutMs = env.aiTimeoutMs ?? 30_000;

  return {
    enabled: env.aiEnabled ?? true,
    maxContextMessages: env.aiMaxContextMessages ?? 12,
    maxContextCharacters: env.aiMaxContextCharacters ?? 8_000,
    providers: {
      openai: {
        enabled: env.openaiEnabled ?? true,
        apiKey: env.openaiApiKey ?? '',
        model: env.openaiModel ?? DEFAULT_MODELS.openai,
        baseUrl: env.openaiBaseUrl ?? DEFAULT_BASE_URLS.openai,
        timeoutMs,
      },
      gemini: {
        enabled: env.geminiEnabled ?? true,
        apiKey: env.geminiApiKey ?? '',
        model: env.geminiModel ?? DEFAULT_MODELS.gemini,
        baseUrl: env.geminiBaseUrl ?? DEFAULT_BASE_URLS.gemini,
        timeoutMs,
      },
      claude: {
        enabled: env.anthropicEnabled ?? true,
        apiKey: env.anthropicApiKey ?? '',
        model: env.anthropicModel ?? DEFAULT_MODELS.claude,
        baseUrl: env.anthropicBaseUrl ?? DEFAULT_BASE_URLS.claude,
        timeoutMs,
      },
      local: {
        enabled: env.localAiEnabled ?? false,
        apiKey: env.localAiApiKey ?? 'local',
        model: env.localAiModel ?? DEFAULT_MODELS.local,
        baseUrl: env.localAiBaseUrl ?? DEFAULT_BASE_URLS.local,
        timeoutMs,
      },
    },
    priorities: {
      general: env.aiPriorityGeneral ?? DEFAULT_PRIORITIES.general,
      coding: env.aiPriorityCoding ?? DEFAULT_PRIORITIES.coding,
      multimodal: env.aiPriorityMultimodal ?? DEFAULT_PRIORITIES.multimodal,
      summarization: env.aiPriorityMultimodal ?? DEFAULT_PRIORITIES.summarization,
      planning: env.aiPriorityGeneral ?? DEFAULT_PRIORITIES.planning,
    },
  };
}
