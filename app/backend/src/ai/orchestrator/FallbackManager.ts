import type { ILogger } from '@backend/logging/ILogger';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type { AiCompletionRequest, AiCompletionResult } from '@backend/ai/types';
import { NoProviderAvailableError, normalizeThrown } from '@backend/ai/errors/ProviderError';
import type { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';
import type { UsageTracker } from '@backend/ai/orchestrator/UsageTracker';

/**
 * Walks the routed provider list until one answers. Each failure marks the
 * provider unavailable for its category-specific cooldown, so the next
 * request skips it automatically instead of retrying a dead account.
 */
export class FallbackManager {
  constructor(
    private readonly logger: ILogger,
    private readonly health: ProviderHealthManager,
    private readonly usage: UsageTracker,
  ) {}

  async run(
    providers: readonly IAIProvider[],
    request: AiCompletionRequest,
  ): Promise<AiCompletionResult> {
    const attempted: string[] = [];
    let lastError: Error | null = null;

    for (const provider of providers) {
      attempted.push(provider.id);
      try {
        const result = await provider.complete(request);
        this.health.markSuccess(provider.id);
        this.usage.recordSuccess(provider.id, result.latencyMs, result.usage);
        if (attempted.length > 1) this.usage.recordFallback();
        return { ...result, attempted };
      } catch (error) {
        const normalized = normalizeThrown(provider.id, error);
        lastError = normalized;
        this.health.markFailure(provider.id, normalized.category);
        this.usage.recordFailure(provider.id);
        this.logger.warn('AI provider failed; considering fallback', {
          provider: provider.id,
          category: normalized.category,
          status: normalized.statusCode,
        });
        if (!normalized.retryable) continue;
      }
    }

    throw new NoProviderAvailableError(
      lastError
        ? `All AI providers failed. Last error: ${lastError.message}`
        : 'No AI provider is configured or available.',
      attempted,
    );
  }
}
