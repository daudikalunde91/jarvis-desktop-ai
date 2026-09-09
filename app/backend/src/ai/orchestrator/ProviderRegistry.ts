import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';

/** Holds every known provider adapter, keyed by id. */
export class ProviderRegistry {
  private readonly providers = new Map<string, IAIProvider>();

  register(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IAIProvider | undefined {
    return this.providers.get(id);
  }

  list(): readonly IAIProvider[] {
    return [...this.providers.values()];
  }

  listConfigured(): readonly IAIProvider[] {
    return this.list().filter((provider) => provider.isConfigured());
  }
}
