import type { ILogger } from '@backend/logging/ILogger';
import type { AiConfig } from '@backend/ai/config/AiConfig';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiHealthSummary,
  AiTaskType,
  ProviderState,
  ProviderStatusSnapshot,
} from '@backend/ai/types';
import { NoProviderAvailableError } from '@backend/ai/errors/ProviderError';
import type { ProviderRegistry } from '@backend/ai/orchestrator/ProviderRegistry';
import type { ProviderRouter } from '@backend/ai/orchestrator/ProviderRouter';
import type { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';
import type { FallbackManager } from '@backend/ai/orchestrator/FallbackManager';
import type { ContextManager } from '@backend/ai/orchestrator/ContextManager';
import type { UsageTracker } from '@backend/ai/orchestrator/UsageTracker';

export interface OrchestratedRequest extends AiCompletionRequest {
  readonly taskType?: AiTaskType;
  readonly requiresVision?: boolean;
  readonly requiresToolCalling?: boolean;
}

/**
 * The single AI entry point for the rest of JARVIS.
 *
 * JARVIS remains the orchestrator: this class only decides *which model*
 * answers a reasoning question, never what the operating system does.
 */
export class AIOrchestrator {
  constructor(
    private readonly logger: ILogger,
    private readonly config: AiConfig,
    private readonly registry: ProviderRegistry,
    private readonly router: ProviderRouter,
    private readonly health: ProviderHealthManager,
    private readonly fallback: FallbackManager,
    public readonly context: ContextManager,
    private readonly usage: UsageTracker,
  ) {}

  /** True when at least one provider is enabled, configured and off cooldown. */
  isAvailable(): boolean {
    if (!this.config.enabled) return false;
    return this.registry
      .listConfigured()
      .some((provider) => this.health.isAvailable(provider.id));
  }

  async complete(request: OrchestratedRequest): Promise<AiCompletionResult> {
    if (!this.config.enabled) {
      throw new NoProviderAvailableError('Cloud reasoning is disabled in configuration.');
    }

    const taskType = request.taskType ?? 'general';
    const providers = this.router.route({
      taskType,
      requiresVision: request.requiresVision,
      requiresToolCalling: request.requiresToolCalling,
      preferredProviderId: request.preferredProviderId,
    });

    if (providers.length === 0) {
      throw new NoProviderAvailableError(
        'No AI provider is configured, enabled and healthy for this task.',
      );
    }

    this.usage.recordRequestStart();
    const started = Date.now();
    const result = await this.fallback.run(providers, { ...request, taskType });
    this.logger.info('AI request completed', {
      taskType,
      provider: result.providerId,
      model: result.model,
      latencyMs: Date.now() - started,
      attempted: result.attempted,
    });
    return result;
  }

  /** Secret-free summary for the UI. */
  getHealthSummary(): AiHealthSummary {
    const providers: ProviderStatusSnapshot[] = this.registry.list().map((provider) => {
      let state: ProviderState;
      if (!provider.isEnabled()) state = 'DISABLED';
      else if (!provider.isConfigured()) state = 'NOT_CONFIGURED';
      else if (this.health.isAvailable(provider.id)) state = 'ONLINE';
      else {
        const category = this.health.lastErrorCategory(provider.id);
        state =
          category === 'rate_limit' || category === 'quota_exceeded'
            ? 'RATE_LIMITED'
            : category === 'authentication'
              ? 'AUTH_FAILED'
              : 'UNAVAILABLE';
      }

      const stats = this.usage.get(provider.id);
      return {
        id: provider.id,
        label: provider.label,
        state,
        model: provider.model,
        cooldownUntilMs: this.health.cooldownUntil(provider.id),
        lastErrorCategory: this.health.lastErrorCategory(provider.id),
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        averageLatencyMs: this.usage.averageLatency(provider.id),
      };
    });

    return {
      enabled: this.config.enabled,
      providers,
      fallbackEvents: this.usage.getFallbackEvents(),
      totalRequests: this.usage.getTotalRequests(),
    };
  }
}
