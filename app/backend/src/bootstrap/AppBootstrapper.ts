import path from 'node:path';

import { loadEnv } from '@backend/core/env';
import { ErrorHandler } from '@backend/core/errors/ErrorHandler';
import type { LogLevel } from '@backend/core/constants';
import { ConfigManager } from '@backend/config/ConfigManager';
import { Logger } from '@backend/logging/Logger';
import { ConsoleTransport } from '@backend/logging/transports/ConsoleTransport';
import { FileTransport } from '@backend/logging/transports/FileTransport';
import type { ILogger, ILogTransport } from '@backend/logging/ILogger';
import { FolderBootstrap } from '@backend/bootstrap/FolderBootstrap';
import { DatabaseManager } from '@backend/database/DatabaseManager';
import { IpcRouter } from '@backend/ipc/IpcRouter';
import { registerIpc } from '@backend/ipc/registerIpc';
import { WindowManager } from '@backend/windows/WindowManager';
import { DIContainer } from '@backend/infrastructure/di-container';
import { CommunicationBus } from '@backend/infrastructure/communication-bus';
import { EventSystem } from '@backend/infrastructure/event-system';
import { CapabilityRegistry } from '@backend/infrastructure/capability-registry';
import { HealthMonitor } from '@backend/infrastructure/health-monitor';
import { AgentManager } from '@backend/infrastructure/agent-manager';
import { INFRA_TOKENS } from '@backend/infrastructure/tokens';
import type { ICommunicationBus } from '@backend/infrastructure/communication-bus';
import type { IEventSystem } from '@backend/infrastructure/event-system';
import type { ICapabilityRegistry } from '@backend/infrastructure/capability-registry';
import type { IHealthMonitor } from '@backend/infrastructure/health-monitor';
import type { IAgentManager } from '@backend/infrastructure/agent-manager';
import type { IDIContainer } from '@backend/shared/interfaces/IDIContainer';
import { AudioManager } from '@backend/audio/AudioManager';
import { AudioRouter } from '@backend/audio/AudioRouter';
import { AudioFactory } from '@backend/audio/AudioFactory';
import { AUDIO_TOKENS } from '@backend/audio/tokens';
import type { IAudioManager } from '@backend/audio/interfaces/IAudioManager';
import type { IAudioRouter } from '@backend/audio/interfaces/IAudioRouter';
import type { IAudioFactory } from '@backend/audio/interfaces/IAudioFactory';
import { VoiceRuntimeManager } from '@backend/voice-runtime/VoiceRuntimeManager';
import { VoiceRuntimeFactory } from '@backend/voice-runtime/VoiceRuntimeFactory';
import { VOICE_RUNTIME_TOKENS } from '@backend/voice-runtime/tokens';
import type { IVoiceRuntimeManager } from '@backend/voice-runtime/interfaces/IVoiceRuntimeManager';
import type { IVoiceRuntimeFactory } from '@backend/voice-runtime/interfaces/IVoiceRuntimeFactory';
import { WakeWordManager } from '@backend/wake-word/WakeWordManager';
import { WakeWordProviderRegistry } from '@backend/wake-word/WakeWordProviderRegistry';
import { WakeWordProviderFactory } from '@backend/wake-word/WakeWordProviderFactory';
import { WAKE_WORD_TOKENS } from '@backend/wake-word/tokens';
import { SpeechManager } from '@backend/speech-to-text/SpeechManager';
import { SpeechProviderRegistry } from '@backend/speech-to-text/SpeechProviderRegistry';
import { SpeechProviderFactory } from '@backend/speech-to-text/SpeechProviderFactory';
import { SPEECH_TOKENS } from '@backend/speech-to-text/tokens';
import { VoiceManager } from '@backend/voice-provider/VoiceManager';
import { VoiceProviderRegistry } from '@backend/voice-provider/VoiceProviderRegistry';
import { VoiceProviderFactory } from '@backend/voice-provider/VoiceProviderFactory';
import { VOICE_PROVIDER_TOKENS } from '@backend/voice-provider/tokens';
import type { IWakeWordManager } from '@backend/voice-runtime/interfaces/IWakeWordManager';
import type { ISpeechManager } from '@backend/voice-runtime/interfaces/ISpeechManager';
import type { IVoiceManager } from '@backend/voice-runtime/interfaces/IVoiceManager';
import { BrainManager } from '@backend/brain/BrainManager';
import { RulesEngine } from '@backend/brain/RulesEngine';
import { TaskPlanner } from '@backend/brain/TaskPlanner';
import { ActionExecutor } from '@backend/brain/ActionExecutor';
import { NullCloudReasoner } from '@backend/brain/CloudReasoner';
import { createAiSubsystem } from '@backend/ai/AiFactory';
import { OrchestratedCloudReasoner } from '@backend/ai/OrchestratedCloudReasoner';
import { AI_TOKENS } from '@backend/ai/tokens';
import { BRAIN_TOKENS } from '@backend/brain/tokens';
import { ActionAgentRegistry } from '@backend/agents/ActionAgentRegistry';
import { ShellCommandRunner } from '@backend/agents/runtime/ShellCommandRunner';
import { SystemAgent } from '@backend/agents/system/SystemAgent';
import { FileAgent } from '@backend/agents/files/FileAgent';
import { BrowserAgent } from '@backend/agents/browser/BrowserAgent';
import { CodingAgent } from '@backend/agents/coding/CodingAgent';
import { MemoryAgent } from '@backend/agents/memory/MemoryAgent';
import { AGENT_TOKENS } from '@backend/agents/tokens';
import { PermissionManager } from '@backend/security/PermissionManager';
import { SECURITY_TOKENS } from '@backend/security/tokens';
import { MemoryManager } from '@backend/memory/MemoryManager';
import { SqliteMemoryRepository } from '@backend/memory/SqliteMemoryRepository';
import { MEMORY_TOKENS } from '@backend/memory/tokens';

/**
 * Composition root for the JARVIS main process.
 *
 * Responsible ONLY for constructing and wiring subsystems in the correct
 * order (config -> logging -> error handling -> folders -> database ->
 * core infrastructure -> audio pipeline -> voice runtime -> ipc ->
 * window). It does NOT own Electron application-lifecycle events
 * (app.whenReady, activate, window-all-closed, ...) — that
 * responsibility belongs to `lifecycle/AppLifecycle.ts`, which drives
 * this class from the outside.
 */
export class AppBootstrapper {
  private logger!: Logger;
  private errorHandler!: ErrorHandler;
  private configManager!: ConfigManager;
  private databaseManager!: DatabaseManager;
  private ipcRouter!: IpcRouter;
  private windowManager!: WindowManager;
  private container!: DIContainer;
  private communicationBus!: ICommunicationBus;
  private eventSystem!: IEventSystem;
  private capabilityRegistry!: ICapabilityRegistry;
  private healthMonitor!: IHealthMonitor;
  private agentManager!: IAgentManager;
  private audioManager!: IAudioManager;
  private audioRouter!: IAudioRouter;
  private audioFactory!: IAudioFactory;
  private wakeWordManager!: IWakeWordManager;
  private speechManager!: ISpeechManager;
  private voiceManager!: IVoiceManager;
  private voiceRuntimeManager!: IVoiceRuntimeManager;
  private voiceRuntimeFactory!: IVoiceRuntimeFactory;
  private brainManager!: BrainManager;
  private aiOrchestrator!: import('@backend/ai/orchestrator/AIOrchestrator').AIOrchestrator;
  private aiToolRegistry!: import('@backend/ai/tools/ToolRegistry').ToolRegistry;

  // This file lives at <project>/app/backend/{src|dist}/bootstrap/AppBootstrapper.{ts|js},
  // so __dirname is <project>/app/backend/{src|dist}/bootstrap -> four levels up to <project>.
  // (Previously this only went up three levels, which resolved to <project>/app instead of
  // <project> and silently broke the preload path — see WindowManager wiring below.)
  private readonly rootDir = path.resolve(__dirname, '..', '..', '..', '..');

  async start(): Promise<void> {
    const env = loadEnv(this.rootDir);

    // 1. Config must load first — everything else depends on it.
    this.configManager = new ConfigManager(ConfigManager.resolveDefaultPath(this.rootDir), env);
    const config = this.configManager.load();

    // 2. Logging is bootstrapped from resolved config.
    const transports: ILogTransport[] = [];
    if (config.logging.toConsole) transports.push(new ConsoleTransport());
    if (config.logging.toFile) {
      transports.push(new FileTransport(path.join(this.rootDir, config.logging.directory)));
    }
    this.logger = new Logger(transports, config.logging.level as LogLevel);

    // 3. Global error handling, wired to the logger.
    this.errorHandler = new ErrorHandler(this.logger);
    this.errorHandler.registerGlobalHandlers();

    // 4. Ensure runtime folder layout exists.
    new FolderBootstrap(this.rootDir, this.logger).run();

    // 5. Database connection (foundation only — no schema yet).
    this.databaseManager = new DatabaseManager(
      path.join(this.rootDir, config.database.directory),
      config.database.filename,
      this.logger,
    );
    this.databaseManager.connect();

    // 6. Core Infrastructure — wired through the DI Container so future
    //    agents/plugins resolve the same singletons instead of
    //    constructing their own. No business/AI logic lives here.
    this.container = new DIContainer();

    this.container.register(
      INFRA_TOKENS.EventSystem,
      () => new EventSystem(this.logger),
      'singleton',
    );

    this.container.register(
      INFRA_TOKENS.CommunicationBus,
      () =>
        new CommunicationBus(this.logger, {
          commandTimeoutMs: config.infrastructure.commandTimeoutMs,
          maxRetryAttempts: config.infrastructure.maxRetryAttempts,
          retryBackoffBaseMs: config.infrastructure.retryBackoffBaseMs,
        }),
      'singleton',
    );

    this.container.register(
      INFRA_TOKENS.CapabilityRegistry,
      (c) => new CapabilityRegistry(this.logger, c.resolve(INFRA_TOKENS.EventSystem)),
      'singleton',
    );

    this.container.register(
      INFRA_TOKENS.HealthMonitor,
      (c) =>
        new HealthMonitor(
          this.logger,
          c.resolve(INFRA_TOKENS.EventSystem),
          config.infrastructure.maxConsecutiveFailures,
        ),
      'singleton',
    );

    this.container.register(
      INFRA_TOKENS.AgentManager,
      (c) =>
        new AgentManager(
          this.logger,
          c.resolve(INFRA_TOKENS.HealthMonitor),
          c.resolve(INFRA_TOKENS.EventSystem),
        ),
      'singleton',
    );

    this.eventSystem = this.container.resolve(INFRA_TOKENS.EventSystem);
    this.communicationBus = this.container.resolve(INFRA_TOKENS.CommunicationBus);
    this.capabilityRegistry = this.container.resolve(INFRA_TOKENS.CapabilityRegistry);
    this.healthMonitor = this.container.resolve(INFRA_TOKENS.HealthMonitor);
    this.agentManager = this.container.resolve(INFRA_TOKENS.AgentManager);

    this.healthMonitor.startMonitoring(config.infrastructure.healthPollIntervalMs);
    this.logger.info('Core Infrastructure wired', {
      services: [
        'CommunicationBus',
        'EventSystem',
        'CapabilityRegistry',
        'HealthMonitor',
        'AgentManager',
      ],
    });

    // 7. Audio Pipeline Architecture — registered into the *same*
    //    DIContainer instance from step 6, reusing EventSystem and
    //    HealthMonitor. Architecture only: no microphone capture, no
    //    STT/TTS, no wake-word engine exists anywhere here.
    this.container.register(AUDIO_TOKENS.AudioFactory, () => new AudioFactory(), 'singleton');

    this.container.register(
      AUDIO_TOKENS.AudioRouter,
      (c) => new AudioRouter(this.logger, c.resolve(INFRA_TOKENS.EventSystem)),
      'singleton',
    );

    this.container.register(
      AUDIO_TOKENS.AudioManager,
      (c) =>
        new AudioManager(
          this.logger,
          c.resolve(AUDIO_TOKENS.AudioFactory),
          c.resolve(AUDIO_TOKENS.AudioRouter),
          {
            bufferCapacity: config.audio.bufferCapacity,
            maxConcurrentSessions: config.audio.maxConcurrentSessions,
          },
          c.resolve(INFRA_TOKENS.HealthMonitor),
          c.resolve(INFRA_TOKENS.EventSystem),
        ),
      'singleton',
    );

    this.audioFactory = this.container.resolve(AUDIO_TOKENS.AudioFactory);
    this.audioRouter = this.container.resolve(AUDIO_TOKENS.AudioRouter);
    this.audioManager = this.container.resolve(AUDIO_TOKENS.AudioManager);

    this.logger.info('Audio Pipeline Architecture wired', {
      services: ['AudioManager', 'AudioRouter', 'AudioFactory'],
    });

    // 8. Voice Provider (M3.1) / Speech-to-Text (M3.2) / Wake Word (M3.3)
    //    Architecture — each registers a provider registry, a factory,
    //    and a top-level Manager class that implements the *existing*
    //    Milestone 4.0 provider interface (IVoiceManager / ISpeechManager
    //    / IWakeWordManager respectively). This is the integration
    //    boundary between M3.1–3.3 and M4.0: no duplicate interfaces, no
    //    duplicate managers — VoiceRuntimeManager.ts itself is untouched.
    //    No concrete provider (real TTS/STT/wake-word engine) is
    //    registered into any of these registries anywhere in this
    //    project — see docs/MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md,
    //    MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md, and
    //    MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md.
    this.container.register(
      WAKE_WORD_TOKENS.WakeWordProviderRegistry,
      () => new WakeWordProviderRegistry(this.logger),
      'singleton',
    );
    this.container.register(
      WAKE_WORD_TOKENS.WakeWordProviderFactory,
      () => new WakeWordProviderFactory(),
      'singleton',
    );
    this.container.register(
      WAKE_WORD_TOKENS.WakeWordManager,
      (c) =>
        new WakeWordManager(
          this.logger,
          c.resolve(WAKE_WORD_TOKENS.WakeWordProviderRegistry),
          c.resolve(WAKE_WORD_TOKENS.WakeWordProviderFactory).createProfile({
            wakeWordPhrase: config.wakeWord.defaultWakeWord,
            sensitivity: config.wakeWord.sensitivity,
            confidenceThreshold: config.wakeWord.confidenceThreshold,
            cooldownMs: config.wakeWord.cooldownMs,
            secureWakeLevel: config.wakeWord.secureWakeEnabled ? 'elevated' : 'standard',
          }),
          c.resolve(AUDIO_TOKENS.AudioRouter),
        ),
      'singleton',
    );

    this.container.register(
      SPEECH_TOKENS.SpeechProviderRegistry,
      () => new SpeechProviderRegistry(this.logger),
      'singleton',
    );
    this.container.register(
      SPEECH_TOKENS.SpeechProviderFactory,
      () => new SpeechProviderFactory(),
      'singleton',
    );
    this.container.register(
      SPEECH_TOKENS.SpeechManager,
      (c) =>
        new SpeechManager(
          this.logger,
          c.resolve(SPEECH_TOKENS.SpeechProviderRegistry),
          c.resolve(SPEECH_TOKENS.SpeechProviderFactory),
          {
            defaultLanguage: config.speechToText.defaultLanguage,
            autoDetectLanguage: config.speechToText.autoDetectLanguage,
          },
          c.resolve(AUDIO_TOKENS.AudioRouter),
        ),
      'singleton',
    );

    this.container.register(
      VOICE_PROVIDER_TOKENS.VoiceProviderRegistry,
      () => new VoiceProviderRegistry(this.logger),
      'singleton',
    );
    this.container.register(
      VOICE_PROVIDER_TOKENS.VoiceProviderFactory,
      () => new VoiceProviderFactory(),
      'singleton',
    );
    this.container.register(
      VOICE_PROVIDER_TOKENS.VoiceManager,
      (c) =>
        new VoiceManager(
          this.logger,
          c.resolve(VOICE_PROVIDER_TOKENS.VoiceProviderRegistry),
          c.resolve(VOICE_PROVIDER_TOKENS.VoiceProviderFactory).createProfile({
            gender: config.voiceProvider.defaultGender,
            language: config.voiceProvider.defaultLanguage,
            providerId: config.voiceProvider.preferredProviderId,
          }),
          c.resolve(AUDIO_TOKENS.AudioRouter),
        ),
      'singleton',
    );

    this.wakeWordManager = this.container.resolve(WAKE_WORD_TOKENS.WakeWordManager);
    this.speechManager = this.container.resolve(SPEECH_TOKENS.SpeechManager);
    this.voiceManager = this.container.resolve(VOICE_PROVIDER_TOKENS.VoiceManager);

    this.logger.info('Voice Provider / Speech-to-Text / Wake Word architecture wired', {
      services: ['WakeWordManager', 'SpeechManager', 'VoiceManager'],
    });

    // 9. Voice Runtime Framework — connects AudioManager (step 7) and the
    //    Wake Word / Speech-to-Text / Voice Provider managers (step 8)
    //    into one runtime pipeline, on top of
    //    CommunicationBus/EventSystem/HealthMonitor (step 6).
    //    `VoiceRuntimeManager` itself is completely unmodified from its
    //    Milestone 4.0 implementation — only the values passed into its
    //    already-optional constructor dependencies changed, here in the
    //    composition root.
    this.container.register(
      VOICE_RUNTIME_TOKENS.VoiceRuntimeFactory,
      () => new VoiceRuntimeFactory(),
      'singleton',
    );

    this.container.register(
      VOICE_RUNTIME_TOKENS.VoiceRuntimeManager,
      (c) =>
        new VoiceRuntimeManager(
          this.logger,
          {
            audioManager: c.resolve(AUDIO_TOKENS.AudioManager),
            factory: c.resolve(VOICE_RUNTIME_TOKENS.VoiceRuntimeFactory),
            communicationBus: c.resolve(INFRA_TOKENS.CommunicationBus),
            eventSystem: c.resolve(INFRA_TOKENS.EventSystem),
            healthMonitor: c.resolve(INFRA_TOKENS.HealthMonitor),
            wakeWordManager: c.resolve(WAKE_WORD_TOKENS.WakeWordManager),
            speechManager: c.resolve(SPEECH_TOKENS.SpeechManager),
            voiceManager: c.resolve(VOICE_PROVIDER_TOKENS.VoiceManager),
          },
          {
            defaultSessionTimeoutMs: config.voiceRuntime.defaultSessionTimeoutMs,
            maxRetryAttempts: config.voiceRuntime.maxRetryAttempts,
            retryBackoffBaseMs: config.voiceRuntime.retryBackoffBaseMs,
          },
        ),
      'singleton',
    );

    this.voiceRuntimeFactory = this.container.resolve(VOICE_RUNTIME_TOKENS.VoiceRuntimeFactory);
    this.voiceRuntimeManager = this.container.resolve(VOICE_RUNTIME_TOKENS.VoiceRuntimeManager);
    await this.voiceRuntimeManager.initialize();

    this.logger.info('Voice Runtime Framework wired', {
      services: ['VoiceRuntimeManager', 'VoiceRuntimeFactory'],
    });

    // 10. AI Brain + executable agents. Compose the M5-M9 layer here so
    // the implementation is part of the actual running application.
    const commandRunner = new ShellCommandRunner();
    const actionAgents = new ActionAgentRegistry(this.logger);
    const permissionManager = new PermissionManager(this.logger, 'admin');
    const memoryManager = new MemoryManager(
      this.logger,
      new SqliteMemoryRepository(this.databaseManager.getConnection()),
    );
    memoryManager.initialize();

    actionAgents.register(new SystemAgent(this.logger, commandRunner));
    actionAgents.register(new FileAgent(this.logger, commandRunner));
    actionAgents.register(new BrowserAgent(this.logger, commandRunner));
    actionAgents.register(
      new CodingAgent(this.logger, commandRunner, { workspaceRoot: this.rootDir }),
    );
    actionAgents.register(new MemoryAgent(this.logger, memoryManager));

    this.container.register(AGENT_TOKENS.CommandRunner, () => commandRunner, 'singleton');
    this.container.register(AGENT_TOKENS.ActionAgentRegistry, () => actionAgents, 'singleton');
    this.container.register(SECURITY_TOKENS.PermissionManager, () => permissionManager, 'singleton');
    this.container.register(MEMORY_TOKENS.MemoryManager, () => memoryManager, 'singleton');
    this.container.register(BRAIN_TOKENS.RulesEngine, () => new RulesEngine(this.logger), 'singleton');
    this.container.register(BRAIN_TOKENS.TaskPlanner, () => new TaskPlanner(), 'singleton');
    this.container.register(
      BRAIN_TOKENS.ActionExecutor,
      (c) =>
        new ActionExecutor(
          this.logger,
          c.resolve(AGENT_TOKENS.ActionAgentRegistry),
          c.resolve(SECURITY_TOKENS.PermissionManager),
        ),
      'singleton',
    );
    // Milestone 5 — real AI brain. Local rules still answer first; the
    // orchestrator is only reachable through the CloudReasoner extension
    // point the BrainManager already had.
    const ai = createAiSubsystem(this.logger, loadEnv(this.rootDir), permissionManager);
    this.aiOrchestrator = ai.orchestrator;
    this.aiToolRegistry = ai.toolRegistry;

    this.container.register(AI_TOKENS.ProviderRegistry, () => ai.registry, 'singleton');
    this.container.register(AI_TOKENS.ProviderHealthManager, () => ai.health, 'singleton');
    this.container.register(AI_TOKENS.ContextManager, () => ai.context, 'singleton');
    this.container.register(AI_TOKENS.UsageTracker, () => ai.usage, 'singleton');
    this.container.register(AI_TOKENS.ToolRegistry, () => ai.toolRegistry, 'singleton');
    this.container.register(AI_TOKENS.ToolExecutor, () => ai.toolExecutor, 'singleton');
    this.container.register(AI_TOKENS.AIOrchestrator, () => ai.orchestrator, 'singleton');

    this.container.register(
      BRAIN_TOKENS.CloudReasoner,
      () =>
        ai.config.enabled
          ? new OrchestratedCloudReasoner(this.logger, ai.orchestrator)
          : new NullCloudReasoner(),
      'singleton',
    );
    this.container.register(
      BRAIN_TOKENS.BrainManager,
      (c) =>
        new BrainManager(
          this.logger,
          c.resolve(BRAIN_TOKENS.RulesEngine),
          c.resolve(BRAIN_TOKENS.TaskPlanner),
          c.resolve(BRAIN_TOKENS.ActionExecutor),
          c.resolve(MEMORY_TOKENS.MemoryManager),
          c.resolve(BRAIN_TOKENS.CloudReasoner),
        ),
      'singleton',
    );
    this.brainManager = this.container.resolve(BRAIN_TOKENS.BrainManager);

    this.logger.info('AI providers wired', {
      enabled: ai.config.enabled,
      providers: ai.registry.list().map((provider) => ({
        id: provider.id,
        configured: provider.isConfigured(),
        model: provider.model,
      })),
      tools: ai.toolRegistry.list().map((tool) => tool.name),
    });

    this.logger.info('AI Brain and agents wired', {
      agents: actionAgents.listAgents().map((agent) => agent.id),
      actions: actionAgents.listActions(),
      permissionRole: permissionManager.getRole(),
    });

    // 11. IPC foundation — registration itself lives in ipc/registerIpc.ts.
    this.ipcRouter = new IpcRouter(this.logger);
    registerIpc(
      this.ipcRouter,
      this.configManager,
      this.brainManager,
      this.aiOrchestrator,
      this.aiToolRegistry,
    );

    // 12. Main window (creation is deferred — see createWindow()).
    // The preload is compiled by the backend build into dist/preload.js.
    // Using the compiled preload in both dev and production keeps the
    // renderer bridge compatible with Electron's preload loader.
    const preloadPath = config.app.environment === 'development'
      ? path.join(this.rootDir, 'app', 'backend', 'src', 'preload.cjs')
      : path.join(this.rootDir, 'app', 'backend', 'dist', 'preload.cjs');
    this.logger.debug('Resolved preload path', { preloadPath });
    this.windowManager = new WindowManager(
      config,
      this.logger,
      preloadPath,
      path.join(this.rootDir, 'app', 'frontend', 'dist'),
    );

    this.logger.info(`${config.app.name} starting`, { environment: config.app.environment });
  }

  createWindow(): void {
    this.windowManager.createMainWindow();
  }

  hasOpenWindows(): boolean {
    return this.windowManager.getMainWindow() !== null;
  }

  shutdown(): void {
    void this.voiceRuntimeManager?.dispose();
    void this.audioManager?.dispose();
    this.healthMonitor?.stopMonitoring();
    this.ipcRouter?.dispose();
    this.databaseManager?.close();
    this.logger?.info('Application shutting down');
  }

  getLogger(): ILogger {
    return this.logger;
  }

  getContainer(): IDIContainer {
    return this.container;
  }

  getCommunicationBus(): ICommunicationBus {
    return this.communicationBus;
  }

  getEventSystem(): IEventSystem {
    return this.eventSystem;
  }

  getCapabilityRegistry(): ICapabilityRegistry {
    return this.capabilityRegistry;
  }

  getHealthMonitor(): IHealthMonitor {
    return this.healthMonitor;
  }

  getAgentManager(): IAgentManager {
    return this.agentManager;
  }

  getAudioManager(): IAudioManager {
    return this.audioManager;
  }

  getAudioRouter(): IAudioRouter {
    return this.audioRouter;
  }

  getAudioFactory(): IAudioFactory {
    return this.audioFactory;
  }

  getWakeWordManager(): IWakeWordManager {
    return this.wakeWordManager;
  }

  getSpeechManager(): ISpeechManager {
    return this.speechManager;
  }

  getVoiceManager(): IVoiceManager {
    return this.voiceManager;
  }

  getVoiceRuntimeManager(): IVoiceRuntimeManager {
    return this.voiceRuntimeManager;
  }

  getVoiceRuntimeFactory(): IVoiceRuntimeFactory {
    return this.voiceRuntimeFactory;
  }
}
