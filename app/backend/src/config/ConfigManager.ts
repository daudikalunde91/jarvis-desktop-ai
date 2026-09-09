import fs from 'node:fs';
import path from 'node:path';

import type { AppConfig, IConfigManager } from '@backend/config/IConfigManager';
import { DEFAULT_CONFIG } from '@backend/config/default.config';
import type { AppEnv } from '@backend/core/env';
import { ConfigError } from '@backend/core/errors/AppError';

/**
 * File-backed Configuration Manager.
 *
 * Precedence (lowest to highest):
 *   1. DEFAULT_CONFIG (compiled-in defaults)
 *   2. config/app.config.json (user/deployment overrides)
 *   3. Environment variables (loaded via EnvLoader)
 */
export class ConfigManager implements IConfigManager {
  private config: AppConfig | null = null;

  constructor(
    private readonly configFilePath: string,
    private readonly env: AppEnv,
  ) {}

  load(): AppConfig {
    const fileConfig = this.readConfigFile();

    this.config = {
      app: {
        name: this.env.appName ?? fileConfig.app?.name ?? DEFAULT_CONFIG.app.name,
        environment:
          this.env.appEnv ?? fileConfig.app?.environment ?? DEFAULT_CONFIG.app.environment,
      },
      window: {
        width: this.env.windowWidth ?? fileConfig.window?.width ?? DEFAULT_CONFIG.window.width,
        height: this.env.windowHeight ?? fileConfig.window?.height ?? DEFAULT_CONFIG.window.height,
        devTools:
          this.env.windowDevTools ?? fileConfig.window?.devTools ?? DEFAULT_CONFIG.window.devTools,
      },
      renderer: {
        devServerUrl:
          this.env.devServerUrl ??
          fileConfig.renderer?.devServerUrl ??
          DEFAULT_CONFIG.renderer.devServerUrl,
      },
      infrastructure: {
        commandTimeoutMs:
          this.env.infraCommandTimeoutMs ??
          fileConfig.infrastructure?.commandTimeoutMs ??
          DEFAULT_CONFIG.infrastructure.commandTimeoutMs,
        maxRetryAttempts:
          this.env.infraMaxRetryAttempts ??
          fileConfig.infrastructure?.maxRetryAttempts ??
          DEFAULT_CONFIG.infrastructure.maxRetryAttempts,
        retryBackoffBaseMs:
          this.env.infraRetryBackoffBaseMs ??
          fileConfig.infrastructure?.retryBackoffBaseMs ??
          DEFAULT_CONFIG.infrastructure.retryBackoffBaseMs,
        healthPollIntervalMs:
          this.env.infraHealthPollIntervalMs ??
          fileConfig.infrastructure?.healthPollIntervalMs ??
          DEFAULT_CONFIG.infrastructure.healthPollIntervalMs,
        maxConsecutiveFailures:
          this.env.infraMaxConsecutiveFailures ??
          fileConfig.infrastructure?.maxConsecutiveFailures ??
          DEFAULT_CONFIG.infrastructure.maxConsecutiveFailures,
      },
      audio: {
        sampleRateHz:
          this.env.audioSampleRateHz ??
          fileConfig.audio?.sampleRateHz ??
          DEFAULT_CONFIG.audio.sampleRateHz,
        channels:
          this.env.audioChannels ?? fileConfig.audio?.channels ?? DEFAULT_CONFIG.audio.channels,
        bitDepth:
          this.env.audioBitDepth ?? fileConfig.audio?.bitDepth ?? DEFAULT_CONFIG.audio.bitDepth,
        bufferCapacity:
          this.env.audioBufferCapacity ??
          fileConfig.audio?.bufferCapacity ??
          DEFAULT_CONFIG.audio.bufferCapacity,
        maxConcurrentSessions:
          this.env.audioMaxConcurrentSessions ??
          fileConfig.audio?.maxConcurrentSessions ??
          DEFAULT_CONFIG.audio.maxConcurrentSessions,
        defaultLanguage:
          this.env.audioDefaultLanguage ??
          fileConfig.audio?.defaultLanguage ??
          DEFAULT_CONFIG.audio.defaultLanguage,
        noiseReductionEnabled:
          this.env.audioNoiseReductionEnabled ??
          fileConfig.audio?.noiseReductionEnabled ??
          DEFAULT_CONFIG.audio.noiseReductionEnabled,
        echoCancellationEnabled:
          this.env.audioEchoCancellationEnabled ??
          fileConfig.audio?.echoCancellationEnabled ??
          DEFAULT_CONFIG.audio.echoCancellationEnabled,
      },
      voiceRuntime: {
        defaultSessionTimeoutMs:
          this.env.voiceRuntimeSessionTimeoutMs ??
          fileConfig.voiceRuntime?.defaultSessionTimeoutMs ??
          DEFAULT_CONFIG.voiceRuntime.defaultSessionTimeoutMs,
        maxRetryAttempts:
          this.env.voiceRuntimeMaxRetryAttempts ??
          fileConfig.voiceRuntime?.maxRetryAttempts ??
          DEFAULT_CONFIG.voiceRuntime.maxRetryAttempts,
        retryBackoffBaseMs:
          this.env.voiceRuntimeRetryBackoffBaseMs ??
          fileConfig.voiceRuntime?.retryBackoffBaseMs ??
          DEFAULT_CONFIG.voiceRuntime.retryBackoffBaseMs,
      },
      voiceProvider: {
        defaultGender:
          this.env.voiceProviderDefaultGender ??
          fileConfig.voiceProvider?.defaultGender ??
          DEFAULT_CONFIG.voiceProvider.defaultGender,
        defaultLanguage:
          this.env.voiceProviderDefaultLanguage ??
          fileConfig.voiceProvider?.defaultLanguage ??
          DEFAULT_CONFIG.voiceProvider.defaultLanguage,
        fallbackEnabled:
          this.env.voiceProviderFallbackEnabled ??
          fileConfig.voiceProvider?.fallbackEnabled ??
          DEFAULT_CONFIG.voiceProvider.fallbackEnabled,
        preferredProviderId:
          this.env.voiceProviderPreferredProviderId ??
          fileConfig.voiceProvider?.preferredProviderId ??
          DEFAULT_CONFIG.voiceProvider.preferredProviderId,
      },
      speechToText: {
        defaultLanguage:
          this.env.speechToTextDefaultLanguage ??
          fileConfig.speechToText?.defaultLanguage ??
          DEFAULT_CONFIG.speechToText.defaultLanguage,
        autoDetectLanguage:
          this.env.speechToTextAutoDetectLanguage ??
          fileConfig.speechToText?.autoDetectLanguage ??
          DEFAULT_CONFIG.speechToText.autoDetectLanguage,
        supportedLanguages:
          this.env.speechToTextSupportedLanguages ??
          fileConfig.speechToText?.supportedLanguages ??
          DEFAULT_CONFIG.speechToText.supportedLanguages,
        streamingEnabled:
          this.env.speechToTextStreamingEnabled ??
          fileConfig.speechToText?.streamingEnabled ??
          DEFAULT_CONFIG.speechToText.streamingEnabled,
      },
      wakeWord: {
        defaultWakeWord:
          this.env.wakeWordDefaultWakeWord ??
          fileConfig.wakeWord?.defaultWakeWord ??
          DEFAULT_CONFIG.wakeWord.defaultWakeWord,
        sensitivity:
          this.env.wakeWordSensitivity ??
          fileConfig.wakeWord?.sensitivity ??
          DEFAULT_CONFIG.wakeWord.sensitivity,
        confidenceThreshold:
          this.env.wakeWordConfidenceThreshold ??
          fileConfig.wakeWord?.confidenceThreshold ??
          DEFAULT_CONFIG.wakeWord.confidenceThreshold,
        cooldownMs:
          this.env.wakeWordCooldownMs ??
          fileConfig.wakeWord?.cooldownMs ??
          DEFAULT_CONFIG.wakeWord.cooldownMs,
        secureWakeEnabled:
          this.env.wakeWordSecureWakeEnabled ??
          fileConfig.wakeWord?.secureWakeEnabled ??
          DEFAULT_CONFIG.wakeWord.secureWakeEnabled,
      },
      database: {
        filename:
          this.env.dbFilename ?? fileConfig.database?.filename ?? DEFAULT_CONFIG.database.filename,
        directory:
          this.env.dbDirectory ??
          fileConfig.database?.directory ??
          DEFAULT_CONFIG.database.directory,
      },
      logging: {
        level: this.env.logLevel ?? fileConfig.logging?.level ?? DEFAULT_CONFIG.logging.level,
        directory:
          this.env.logDirectory ??
          fileConfig.logging?.directory ??
          DEFAULT_CONFIG.logging.directory,
        toFile: this.env.logToFile ?? fileConfig.logging?.toFile ?? DEFAULT_CONFIG.logging.toFile,
        toConsole:
          this.env.logToConsole ??
          fileConfig.logging?.toConsole ??
          DEFAULT_CONFIG.logging.toConsole,
      },
    };

    return this.config;
  }

  private readConfigFile(): Partial<AppConfig> {
    try {
      if (!fs.existsSync(this.configFilePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.configFilePath, 'utf-8');
      return JSON.parse(raw) as Partial<AppConfig>;
    } catch (error) {
      throw new ConfigError(`Failed to read configuration file at ${this.configFilePath}`, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  get<K extends keyof AppConfig>(section: K): AppConfig[K] {
    if (!this.config) {
      throw new ConfigError('ConfigManager.get() called before load()');
    }
    return this.config[section];
  }

  getAll(): AppConfig {
    if (!this.config) {
      throw new ConfigError('ConfigManager.getAll() called before load()');
    }
    return this.config;
  }

  static resolveDefaultPath(rootDir: string): string {
    return path.join(rootDir, 'config', 'app.config.json');
  }
}
