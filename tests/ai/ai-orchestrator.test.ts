import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createTestLogger } from '../support/testLogger';
import { buildAiConfig } from '@backend/ai/config/AiConfig';
import { ProviderRegistry } from '@backend/ai/orchestrator/ProviderRegistry';
import { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';
import { ProviderRouter } from '@backend/ai/orchestrator/ProviderRouter';
import { FallbackManager } from '@backend/ai/orchestrator/FallbackManager';
import { ContextManager } from '@backend/ai/orchestrator/ContextManager';
import { UsageTracker } from '@backend/ai/orchestrator/UsageTracker';
import { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type { AiCompletionResult, ProviderCapabilities } from '@backend/ai/types';
import {
  AuthenticationError,
  NoProviderAvailableError,
  QuotaExceededError,
  RateLimitError,
  TimeoutError,
} from '@backend/ai/errors/ProviderError';

const CAPS: ProviderCapabilities = {
  reasoning: true,
  coding: true,
  vision: true,
  toolCalling: true,
  streaming: false,
};

class FakeProvider implements IAIProvider {
  public readonly capabilities = CAPS;
  public calls = 0;

  constructor(
    public readonly id: string,
    public readonly label: string,
    private readonly behaviour: 'ok' | Error,
    private readonly configured = true,
    private readonly enabled = true,
  ) {}

  get model(): string {
    return `${this.id}-model`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isConfigured(): boolean {
    return this.enabled && this.configured;
  }

  async complete(): Promise<AiCompletionResult> {
    this.calls += 1;
    if (this.behaviour !== 'ok') throw this.behaviour;
    return {
      text: `answer from ${this.id}`,
      providerId: this.id,
      model: this.model,
      latencyMs: 5,
      attempted: [this.id],
    };
  }
}

function buildOrchestrator(providers: IAIProvider[], overrides = {}) {
  const logger = createTestLogger();
  const config = buildAiConfig({
    openaiApiKey: 'x',
    geminiApiKey: 'x',
    anthropicApiKey: 'x',
    ...overrides,
  });
  const registry = new ProviderRegistry();
  providers.forEach((provider) => registry.register(provider));
  const health = new ProviderHealthManager();
  const usage = new UsageTracker();
  const router = new ProviderRouter(registry, health, config);
  const fallback = new FallbackManager(logger, health, usage);
  const context = new ContextManager({ maxMessages: 6, maxCharacters: 500 });
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
  return { orchestrator, health, usage, registry };
}

const REQUEST = { messages: [{ role: 'user' as const, content: 'Explain this error' }] };

describe('AIOrchestrator', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses the first healthy provider in the priority list (OpenAI success)', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', 'ok');
    const gemini = new FakeProvider('gemini', 'Gemini', 'ok');
    const { orchestrator } = buildOrchestrator([openai, gemini]);

    const result = await orchestrator.complete({ ...REQUEST, taskType: 'general' });

    expect(result.providerId).toBe('openai');
    expect(gemini.calls).toBe(0);
  });

  it('falls back to Gemini when OpenAI is rate limited', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', new RateLimitError('openai'));
    const gemini = new FakeProvider('gemini', 'Gemini', 'ok');
    const { orchestrator, usage } = buildOrchestrator([openai, gemini]);

    const result = await orchestrator.complete({ ...REQUEST, taskType: 'general' });

    expect(result.providerId).toBe('gemini');
    expect(result.attempted).toEqual(['openai', 'gemini']);
    expect(usage.getFallbackEvents()).toBe(1);
  });

  it('falls back from Gemini to Claude on quota exhaustion', async () => {
    const gemini = new FakeProvider('gemini', 'Gemini', new QuotaExceededError('gemini'));
    const claude = new FakeProvider('claude', 'Claude', 'ok');
    const { orchestrator } = buildOrchestrator([gemini, claude], {
      aiPriorityGeneral: ['gemini', 'claude'],
    });

    const result = await orchestrator.complete({ ...REQUEST, taskType: 'general' });
    expect(result.providerId).toBe('claude');
  });

  it('routes coding tasks to Claude first', async () => {
    const claude = new FakeProvider('claude', 'Claude', 'ok');
    const openai = new FakeProvider('openai', 'OpenAI', 'ok');
    const { orchestrator } = buildOrchestrator([claude, openai]);

    const result = await orchestrator.complete({ ...REQUEST, taskType: 'coding' });
    expect(result.providerId).toBe('claude');
  });

  it('throws NoProviderAvailableError when every cloud provider fails', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', new TimeoutError('openai'));
    const gemini = new FakeProvider('gemini', 'Gemini', new RateLimitError('gemini'));
    const { orchestrator } = buildOrchestrator([openai, gemini]);

    await expect(orchestrator.complete(REQUEST)).rejects.toBeInstanceOf(NoProviderAvailableError);
  });

  it('marks an invalid API key as AUTH_FAILED and stops using that provider', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', new AuthenticationError('openai'));
    const gemini = new FakeProvider('gemini', 'Gemini', 'ok');
    const { orchestrator } = buildOrchestrator([openai, gemini]);

    await orchestrator.complete(REQUEST);
    const status = orchestrator.getHealthSummary().providers.find((p) => p.id === 'openai');
    expect(status?.state).toBe('AUTH_FAILED');

    await orchestrator.complete(REQUEST);
    expect(openai.calls).toBe(1); // skipped on the second request (cooldown)
  });

  it('skips a provider disabled in configuration', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', 'ok', true, false);
    const gemini = new FakeProvider('gemini', 'Gemini', 'ok');
    const { orchestrator } = buildOrchestrator([openai, gemini]);

    const result = await orchestrator.complete(REQUEST);
    expect(result.providerId).toBe('gemini');
    expect(openai.calls).toBe(0);
  });

  it('refuses to answer when AI is disabled entirely', async () => {
    const openai = new FakeProvider('openai', 'OpenAI', 'ok');
    const { orchestrator } = buildOrchestrator([openai], { aiEnabled: false });

    expect(orchestrator.isAvailable()).toBe(false);
    await expect(orchestrator.complete(REQUEST)).rejects.toBeInstanceOf(NoProviderAvailableError);
  });

  it('never exposes API keys in the health summary', () => {
    const { orchestrator } = buildOrchestrator([new FakeProvider('openai', 'OpenAI', 'ok')], {
      openaiApiKey: 'sk-super-secret-value',
    });
    const serialized = JSON.stringify(orchestrator.getHealthSummary());
    expect(serialized).not.toContain('sk-super-secret-value');
  });
});
