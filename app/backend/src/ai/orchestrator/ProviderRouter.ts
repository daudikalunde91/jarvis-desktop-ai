import type { AiConfig } from '@backend/ai/config/AiConfig';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type { AiTaskType } from '@backend/ai/types';
import type { ProviderRegistry } from '@backend/ai/orchestrator/ProviderRegistry';
import type { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';

export interface RoutingOptions {
  readonly taskType: AiTaskType;
  readonly requiresVision?: boolean;
  readonly requiresToolCalling?: boolean;
  readonly preferredProviderId?: string;
}

/**
 * Decides the ordered list of providers to try for one request:
 * configuration priority, then capability, then health.
 */
export class ProviderRouter {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly health: ProviderHealthManager,
    private readonly config: AiConfig,
  ) {}

  route(options: RoutingOptions): readonly IAIProvider[] {
    const priority = this.config.priorities[options.taskType] ?? this.config.priorities.general;
    const ordered = options.preferredProviderId
      ? [options.preferredProviderId, ...priority.filter((id) => id !== options.preferredProviderId)]
      : [...priority];

    const eligible: IAIProvider[] = [];
    for (const id of ordered) {
      const provider = this.registry.get(id);
      if (!provider || !provider.isConfigured()) continue;
      if (options.requiresVision && !provider.capabilities.vision) continue;
      if (options.requiresToolCalling && !provider.capabilities.toolCalling) continue;
      if (!this.health.isAvailable(provider.id)) continue;
      eligible.push(provider);
    }
    return eligible;
  }
}
