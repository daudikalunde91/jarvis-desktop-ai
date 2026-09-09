import type { ILogger } from '@backend/logging/ILogger';
import type { ProviderConfig } from '@backend/ai/config/AiConfig';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  ProviderCapabilities,
} from '@backend/ai/types';
import { classifyHttpFailure, normalizeThrown } from '@backend/ai/errors/ProviderError';

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Anthropic Claude adapter (Messages API, no SDK bundled). */
export class ClaudeProvider implements IAIProvider {
  public readonly id = 'claude';
  public readonly label = 'Claude';
  public readonly capabilities: ProviderCapabilities = {
    reasoning: true,
    coding: true,
    vision: true,
    toolCalling: true,
    streaming: true,
  };

  constructor(
    private readonly logger: ILogger,
    private readonly config: ProviderConfig,
  ) {}

  get model(): string {
    return this.config.model;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isConfigured(): boolean {
    return this.config.enabled && Boolean(this.config.apiKey && this.config.model);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    request.signal?.addEventListener('abort', () => controller.abort(), { once: true });

    const system = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');

    const messages = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: [
          { type: 'text', text: message.content },
          ...(message.images ?? []).map((image) => ({
            type: 'image',
            source: { type: 'base64', media_type: image.mimeType, data: image.base64 },
          })),
        ],
      }));

    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: request.maxOutputTokens ?? 800,
          temperature: request.temperature ?? 0.4,
          ...(system ? { system } : {}),
          messages,
        }),
      });

      if (!response.ok) {
        throw classifyHttpFailure(this.id, response.status, await response.text());
      }

      const payload = (await response.json()) as ClaudeResponse;
      const text = (payload.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('')
        .trim();

      if (!text) throw classifyHttpFailure(this.id, 502, 'Claude returned an empty response.');

      return {
        text,
        providerId: this.id,
        model: this.config.model,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: payload.usage?.input_tokens,
          completionTokens: payload.usage?.output_tokens,
        },
        attempted: [this.id],
      };
    } catch (error) {
      const normalized = normalizeThrown(this.id, error);
      this.logger.warn('Claude request failed', {
        provider: this.id,
        category: normalized.category,
        status: normalized.statusCode,
      });
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  }
}
