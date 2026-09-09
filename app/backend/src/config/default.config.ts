import type { AppConfig } from '@backend/config/IConfigManager';
import { APP_METADATA, DEFAULT_WINDOW_OPTIONS } from '@backend/core/constants';
import { INFRASTRUCTURE_DEFAULTS } from '@backend/shared/constants/infrastructure.constants';

/**
 * Built-in, hardcode-free defaults. These are the last resort fallback —
 * any value here can be overridden by config/app.config.json or by
 * environment variables (see core/env.ts).
 */
export const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: APP_METADATA.name,
    environment: 'development',
  },
  window: {
    width: DEFAULT_WINDOW_OPTIONS.width,
    height: DEFAULT_WINDOW_OPTIONS.height,
    devTools: true,
  },
  renderer: {
    devServerUrl: 'http://localhost:5173',
  },
  infrastructure: {
    commandTimeoutMs: INFRASTRUCTURE_DEFAULTS.communicationBus.commandTimeoutMs,
    maxRetryAttempts: INFRASTRUCTURE_DEFAULTS.communicationBus.maxRetryAttempts,
    retryBackoffBaseMs: INFRASTRUCTURE_DEFAULTS.communicationBus.retryBackoffBaseMs,
    healthPollIntervalMs: INFRASTRUCTURE_DEFAULTS.healthMonitor.pollIntervalMs,
    maxConsecutiveFailures: INFRASTRUCTURE_DEFAULTS.healthMonitor.maxConsecutiveFailures,
  },
  audio: {
    sampleRateHz: 16000,
    channels: 1,
    bitDepth: 16,
    bufferCapacity: 50,
    maxConcurrentSessions: 1,
    defaultLanguage: 'en-US',
    noiseReductionEnabled: false,
    echoCancellationEnabled: false,
  },
  voiceRuntime: {
    defaultSessionTimeoutMs: 30000,
    maxRetryAttempts: INFRASTRUCTURE_DEFAULTS.communicationBus.maxRetryAttempts,
    retryBackoffBaseMs: INFRASTRUCTURE_DEFAULTS.communicationBus.retryBackoffBaseMs,
  },
  voiceProvider: {
    defaultGender: 'female',
    defaultLanguage: 'en-US',
    fallbackEnabled: true,
    preferredProviderId: null,
  },
  speechToText: {
    defaultLanguage: 'en-US',
    autoDetectLanguage: false,
    supportedLanguages: ['en-US', 'sw-KE'],
    streamingEnabled: true,
  },
  wakeWord: {
    defaultWakeWord: 'Jarvis',
    sensitivity: 0.5,
    confidenceThreshold: 0.6,
    cooldownMs: 1500,
    secureWakeEnabled: false,
  },
  database: {
    filename: 'jarvis.sqlite',
    directory: './database',
  },
  logging: {
    level: 'info',
    directory: './logs',
    toFile: true,
    toConsole: true,
  },
};
