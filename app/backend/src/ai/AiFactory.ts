import type { ILogger } from '@backend/logging/ILogger';
import type { IPermissionManager } from '@backend/security/interfaces/IPermissionManager';
import { buildAiConfig, type AiConfig, type AiEnvInput } from '@backend/ai/config/AiConfig';
import { OpenAIProvider } from '@backend/ai/providers/OpenAIProvider';
import { GeminiProvider } from '@backend/ai/providers/GeminiProvider';
import { ClaudeProvider } from '@backend/ai/providers/ClaudeProvider';
import { LocalProvider } from '@backend/ai/providers/LocalProvider';
import { ProviderRegistry } from '@backend/ai/orchestrator/ProviderRegistry';
import { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';
import { ProviderRouter } from '@backend/ai/orchestrator/ProviderRouter';
import { FallbackManager } from '@backend/ai/orchestrator/FallbackManager';
import { ContextManager } from '@backend/ai/orchestrator/ContextManager';
import { UsageTracker } from '@backend/ai/orchestrator/UsageTracker';
import { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import { ToolRegistry } from '@backend/ai/tools/ToolRegistry';
import { ToolExecutor } from '@backend/ai/tools/ToolExecutor';
import { BUILTIN_TOOLS } from '@backend/ai/tools/builtinTools';

export interface AiSubsystem {
  readonly config: AiConfig;
  readonly registry: ProviderRegistry;
  readonly health: ProviderHealthManager;
  readonly context: ContextManager;
  readonly usage: UsageTracker;
  readonly orchestrator: AIOrchestrator;
  readonly toolRegistry: ToolRegistry;
  readonly toolExecutor: ToolExecutor;
}

/**
 * Composition root for the M5 AI Brain. Everything is constructor-injected
 * so tests can substitute fake providers without touching the network.
 */
export function createAiSubsystem(
  logger: ILogger,
  env: AiEnvInput = {},
  permissions?: IPermissionManager,
): AiSubsystem {
  const config = buildAiConfig(env);

  const registry = new ProviderRegistry();
  registry.register(new OpenAIProvider(logger, config.providers.openai));
  registry.register(new GeminiProvider(logger, config.providers.gemini));
  registry.register(new ClaudeProvider(logger, config.providers.claude));
  registry.register(new LocalProvider(logger, config.providers.local));

  const health = new ProviderHealthManager();
  const usage = new UsageTracker();
  const router = new ProviderRouter(registry, health, config);
  const fallback = new FallbackManager(logger, health, usage);
  const context = new ContextManager({
    maxMessages: config.maxContextMessages,
    maxCharacters: config.maxContextCharacters,
  });

  const orchestrator = new AIOrchestrator(
    logger,
    config,
    registry,
    router,
    health,
    fallback,
    context,
    usage,
  );

  const toolRegistry = new ToolRegistry();
  for (const tool of BUILTIN_TOOLS) toolRegistry.register(tool);
  const toolExecutor = new ToolExecutor(logger, toolRegistry, permissions);

  return { config, registry, health, context, usage, orchestrator, toolRegistry, toolExecutor };
}
