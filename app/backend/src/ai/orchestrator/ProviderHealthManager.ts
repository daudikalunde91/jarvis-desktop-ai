import { COOLDOWN_MS, type ProviderErrorCategory } from '@backend/ai/errors/ProviderError';

interface HealthRecord {
  cooldownUntilMs: number;
  lastErrorCategory: ProviderErrorCategory | null;
}

/**
 * Tracks which providers are temporarily out of service and for how long.
 * Cooldowns are the only reason the router will skip a configured provider.
 */
export class ProviderHealthManager {
  private readonly records = new Map<string, HealthRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  isAvailable(providerId: string): boolean {
    const record = this.records.get(providerId);
    if (!record) return true;
    return record.cooldownUntilMs <= this.now();
  }

  markSuccess(providerId: string): void {
    this.records.delete(providerId);
  }

  markFailure(providerId: string, category: ProviderErrorCategory): void {
    const cooldown = COOLDOWN_MS[category] ?? COOLDOWN_MS.unknown;
    this.records.set(providerId, {
      cooldownUntilMs: cooldown > 0 ? this.now() + cooldown : 0,
      lastErrorCategory: category,
    });
  }

  cooldownUntil(providerId: string): number | null {
    const record = this.records.get(providerId);
    if (!record || record.cooldownUntilMs <= this.now()) return null;
    return record.cooldownUntilMs;
  }

  lastErrorCategory(providerId: string): ProviderErrorCategory | null {
    return this.records.get(providerId)?.lastErrorCategory ?? null;
  }

  reset(): void {
    this.records.clear();
  }
}
