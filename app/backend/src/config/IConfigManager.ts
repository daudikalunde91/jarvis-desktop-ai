export interface AppConfig {
  app: {
    name: string;
    environment: 'development' | 'production' | 'test';
  };
  window: {
    width: number;
    height: number;
    devTools: boolean;
  };
  renderer: {
    /** Vite dev server URL used only when app.environment === 'development'. */
    devServerUrl: string;
  };
  infrastructure: {
    commandTimeoutMs: number;
    maxRetryAttempts: number;
    retryBackoffBaseMs: number;
    healthPollIntervalMs: number;
    maxConsecutiveFailures: number;
  };
  audio: {
    sampleRateHz: number;
    channels: number;
    bitDepth: number;
    bufferCapacity: number;
    maxConcurrentSessions: number;
    defaultLanguage: string;
    noiseReductionEnabled: boolean;
    echoCancellationEnabled: boolean;
  };
  voiceRuntime: {
    defaultSessionTimeoutMs: number;
    maxRetryAttempts: number;
    retryBackoffBaseMs: number;
  };
  voiceProvider: {
    defaultGender: 'female' | 'male' | 'neutral';
    defaultLanguage: string;
    fallbackEnabled: boolean;
    preferredProviderId: string | null;
  };
  speechToText: {
    defaultLanguage: string;
    autoDetectLanguage: boolean;
    supportedLanguages: string[];
    streamingEnabled: boolean;
  };
  wakeWord: {
    defaultWakeWord: string;
    sensitivity: number;
    confidenceThreshold: number;
    cooldownMs: number;
    secureWakeEnabled: boolean;
  };
  database: {
    filename: string;
    directory: string;
  };
  logging: {
    level: string;
    directory: string;
    toFile: boolean;
    toConsole: boolean;
  };
}

/**
 * Configuration Manager abstraction.
 * Merges (in increasing priority): built-in defaults -> config/app.config.json
 * -> environment variables. Consumers only ever read through `get`.
 */
export interface IConfigManager {
  load(): AppConfig;
  get<K extends keyof AppConfig>(section: K): AppConfig[K];
  getAll(): AppConfig;
}
