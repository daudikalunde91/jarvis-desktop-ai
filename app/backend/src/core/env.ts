import path from 'node:path';

import dotenv from 'dotenv';

/**
 * EnvLoader
 * Loads and validates environment variables once at process start.
 * Provides typed, defaulted access — nothing in the codebase should
 * read from `process.env` directly outside of this module.
 */
export interface AppEnv {
  appEnv: 'development' | 'production' | 'test';
  appName: string;
  logLevel: string;
  dbFilename: string;
  dbDirectory: string;
  logDirectory: string;
  logToFile: boolean;
  logToConsole: boolean;
  windowWidth: number;
  windowHeight: number;
  windowDevTools: boolean;
  devServerUrl: string;
  infraCommandTimeoutMs?: number;
  infraMaxRetryAttempts?: number;
  infraRetryBackoffBaseMs?: number;
  infraHealthPollIntervalMs?: number;
  infraMaxConsecutiveFailures?: number;
  audioSampleRateHz?: number;
  audioChannels?: number;
  audioBitDepth?: number;
  audioBufferCapacity?: number;
  audioMaxConcurrentSessions?: number;
  audioDefaultLanguage?: string;
  audioNoiseReductionEnabled?: boolean;
  audioEchoCancellationEnabled?: boolean;
  voiceRuntimeSessionTimeoutMs?: number;
  voiceRuntimeMaxRetryAttempts?: number;
  voiceRuntimeRetryBackoffBaseMs?: number;
  voiceProviderDefaultGender?: 'female' | 'male' | 'neutral';
  voiceProviderDefaultLanguage?: string;
  voiceProviderFallbackEnabled?: boolean;
  voiceProviderPreferredProviderId?: string;
  speechToTextDefaultLanguage?: string;
  speechToTextAutoDetectLanguage?: boolean;
  speechToTextStreamingEnabled?: boolean;
  speechToTextSupportedLanguages?: string[];
  wakeWordDefaultWakeWord?: string;
  wakeWordSensitivity?: number;
  wakeWordConfidenceThreshold?: number;
  wakeWordCooldownMs?: number;
  wakeWordSecureWakeEnabled?: boolean;
  // Milestone 5 — AI Brain. Keys are read here and never leave the main process.
  aiEnabled?: boolean;
  aiTimeoutMs?: number;
  aiMaxContextMessages?: number;
  aiMaxContextCharacters?: number;
  aiPriorityGeneral?: string[];
  aiPriorityCoding?: string[];
  aiPriorityMultimodal?: string[];
  openaiEnabled?: boolean;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
  geminiEnabled?: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiBaseUrl?: string;
  anthropicEnabled?: boolean;
  anthropicApiKey?: string;
  anthropicModel?: string;
  anthropicBaseUrl?: string;
  localAiEnabled?: boolean;
  localAiBaseUrl?: string;
  localAiModel?: string;
  localAiApiKey?: string;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toIntOptional(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toBoolOptional(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value.toLowerCase() === 'true' || value === '1';
}

function toFloatOptional(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toStringArrayOptional(value: string | undefined): string[] | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

let cachedEnv: AppEnv | null = null;

export function loadEnv(rootDir: string = process.cwd()): AppEnv {
  if (cachedEnv) return cachedEnv;

  dotenv.config({ path: path.join(rootDir, '.env') });

  const appEnvRaw = process.env.APP_ENV ?? 'development';
  const appEnv: AppEnv['appEnv'] =
    appEnvRaw === 'production' || appEnvRaw === 'test' ? appEnvRaw : 'development';

  cachedEnv = {
    appEnv,
    appName: process.env.APP_NAME ?? 'JARVIS',
    logLevel: process.env.APP_LOG_LEVEL ?? 'info',
    dbFilename: process.env.DB_FILENAME ?? 'jarvis.sqlite',
    dbDirectory: process.env.DB_DIRECTORY ?? './database',
    logDirectory: process.env.LOG_DIRECTORY ?? './logs',
    logToFile: toBool(process.env.LOG_TO_FILE, true),
    logToConsole: toBool(process.env.LOG_TO_CONSOLE, true),
    windowWidth: toInt(process.env.WINDOW_WIDTH, 1280),
    windowHeight: toInt(process.env.WINDOW_HEIGHT, 800),
    windowDevTools: toBool(process.env.WINDOW_DEV_TOOLS, appEnv !== 'production'),
    devServerUrl: process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173',
    infraCommandTimeoutMs: toIntOptional(process.env.INFRA_COMMAND_TIMEOUT_MS),
    infraMaxRetryAttempts: toIntOptional(process.env.INFRA_MAX_RETRY_ATTEMPTS),
    infraRetryBackoffBaseMs: toIntOptional(process.env.INFRA_RETRY_BACKOFF_BASE_MS),
    infraHealthPollIntervalMs: toIntOptional(process.env.INFRA_HEALTH_POLL_INTERVAL_MS),
    infraMaxConsecutiveFailures: toIntOptional(process.env.INFRA_MAX_CONSECUTIVE_FAILURES),
    audioSampleRateHz: toIntOptional(process.env.AUDIO_SAMPLE_RATE_HZ),
    audioChannels: toIntOptional(process.env.AUDIO_CHANNELS),
    audioBitDepth: toIntOptional(process.env.AUDIO_BIT_DEPTH),
    audioBufferCapacity: toIntOptional(process.env.AUDIO_BUFFER_CAPACITY),
    audioMaxConcurrentSessions: toIntOptional(process.env.AUDIO_MAX_CONCURRENT_SESSIONS),
    audioDefaultLanguage: process.env.AUDIO_DEFAULT_LANGUAGE,
    audioNoiseReductionEnabled: toBoolOptional(process.env.AUDIO_NOISE_REDUCTION_ENABLED),
    audioEchoCancellationEnabled: toBoolOptional(process.env.AUDIO_ECHO_CANCELLATION_ENABLED),
    voiceRuntimeSessionTimeoutMs: toIntOptional(process.env.VOICE_RUNTIME_SESSION_TIMEOUT_MS),
    voiceRuntimeMaxRetryAttempts: toIntOptional(process.env.VOICE_RUNTIME_MAX_RETRY_ATTEMPTS),
    voiceRuntimeRetryBackoffBaseMs: toIntOptional(process.env.VOICE_RUNTIME_RETRY_BACKOFF_BASE_MS),
    voiceProviderDefaultGender: process.env.VOICE_PROVIDER_DEFAULT_GENDER as
      'female' | 'male' | 'neutral' | undefined,
    voiceProviderDefaultLanguage: process.env.VOICE_PROVIDER_DEFAULT_LANGUAGE,
    voiceProviderFallbackEnabled: toBoolOptional(process.env.VOICE_PROVIDER_FALLBACK_ENABLED),
    voiceProviderPreferredProviderId: process.env.VOICE_PROVIDER_PREFERRED_PROVIDER_ID,
    speechToTextDefaultLanguage: process.env.SPEECH_TO_TEXT_DEFAULT_LANGUAGE,
    speechToTextAutoDetectLanguage: toBoolOptional(process.env.SPEECH_TO_TEXT_AUTO_DETECT_LANGUAGE),
    speechToTextStreamingEnabled: toBoolOptional(process.env.SPEECH_TO_TEXT_STREAMING_ENABLED),
    speechToTextSupportedLanguages: toStringArrayOptional(
      process.env.SPEECH_TO_TEXT_SUPPORTED_LANGUAGES,
    ),
    wakeWordDefaultWakeWord: process.env.WAKE_WORD_DEFAULT_WAKE_WORD,
    wakeWordSensitivity: toFloatOptional(process.env.WAKE_WORD_SENSITIVITY),
    wakeWordConfidenceThreshold: toFloatOptional(process.env.WAKE_WORD_CONFIDENCE_THRESHOLD),
    wakeWordCooldownMs: toIntOptional(process.env.WAKE_WORD_COOLDOWN_MS),
    wakeWordSecureWakeEnabled: toBoolOptional(process.env.WAKE_WORD_SECURE_WAKE_ENABLED),
    aiEnabled: toBoolOptional(process.env.AI_ENABLED),
    aiTimeoutMs: toIntOptional(process.env.AI_REQUEST_TIMEOUT_MS),
    aiMaxContextMessages: toIntOptional(process.env.AI_MAX_CONTEXT_MESSAGES),
    aiMaxContextCharacters: toIntOptional(process.env.AI_MAX_CONTEXT_CHARACTERS),
    aiPriorityGeneral: toStringArrayOptional(process.env.AI_PRIORITY_GENERAL),
    aiPriorityCoding: toStringArrayOptional(process.env.AI_PRIORITY_CODING),
    aiPriorityMultimodal: toStringArrayOptional(process.env.AI_PRIORITY_MULTIMODAL),
    openaiEnabled: toBoolOptional(process.env.OPENAI_ENABLED),
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    geminiEnabled: toBoolOptional(process.env.GEMINI_ENABLED),
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    geminiBaseUrl: process.env.GEMINI_BASE_URL,
    anthropicEnabled: toBoolOptional(process.env.ANTHROPIC_ENABLED),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL,
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
    localAiEnabled: toBoolOptional(process.env.LOCAL_AI_ENABLED),
    localAiBaseUrl: process.env.LOCAL_AI_BASE_URL,
    localAiModel: process.env.LOCAL_AI_MODEL,
    localAiApiKey: process.env.LOCAL_AI_API_KEY,
  };

  return cachedEnv;
}
