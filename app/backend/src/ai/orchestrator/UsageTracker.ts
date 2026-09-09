import type { AiUsage } from '@backend/ai/types';

export interface ProviderUsageStats {
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Observability for AI calls. Records provider, latency, outcome, error
 * category and token usage. Never records prompts, keys or secrets.
 */
export class UsageTracker {
  private readonly stats = new Map<string, ProviderUsageStats>();
  private fallbackEvents = 0;
  private totalRequests = 0;

  recordRequestStart(): void {
    this.totalRequests += 1;
  }

  recordSuccess(providerId: string, latencyMs: number, usage?: AiUsage): void {
    const entry = this.entry(providerId);
    entry.successCount += 1;
    entry.totalLatencyMs += latencyMs;
    entry.promptTokens += usage?.promptTokens ?? 0;
    entry.completionTokens += usage?.completionTokens ?? 0;
  }

  recordFailure(providerId: string): void {
    this.entry(providerId).failureCount += 1;
  }

  recordFallback(): void {
    this.fallbackEvents += 1;
  }

  get(providerId: string): ProviderUsageStats {
    return { ...this.entry(providerId) };
  }

  averageLatency(providerId: string): number {
    const entry = this.entry(providerId);
    return entry.successCount === 0 ? 0 : Math.round(entry.totalLatencyMs / entry.successCount);
  }

  getFallbackEvents(): number {
    return this.fallbackEvents;
  }

  getTotalRequests(): number {
    return this.totalRequests;
  }

  private entry(providerId: string): ProviderUsageStats {
    let entry = this.stats.get(providerId);
    if (!entry) {
      entry = {
        successCount: 0,
        failureCount: 0,
        totalLatencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
      };
      this.stats.set(providerId, entry);
    }
    return entry;
  }
}
