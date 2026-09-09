import type { ILogger } from '@backend/logging/ILogger';
import type { ProviderConfig } from '@backend/ai/config/AiConfig';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  ProviderCapabilities,
} from '@backend/ai/types';
import { classifyHttpFailure, normalizeThrown } from '@backend/ai/errors/ProviderError';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Google Gemini adapter (generateContent REST API, no SDK bundled). */
export class GeminiProvider implements IAIProvider {
  public readonly id = 'gemini';
  public readonly label = 'Gemini';
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

    const systemText = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');

    const contents = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [
          { text: message.content },
          ...(message.images ?? []).map((image) => ({
            inline_data: { mime_type: image.mimeType, data: image.base64 },
          })),
        ],
      }));

    try {
      const url =
        `${this.config.baseUrl.replace(/\/$/, '')}/models/${this.config.model}:generateContent` +
        `?key=${encodeURIComponent(this.config.apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
          generationConfig: {
            temperature: request.temperature ?? 0.4,
            maxOutputTokens: request.maxOutputTokens ?? 800,
          },
        }),
      });

      if (!response.ok) {
        throw classifyHttpFailure(this.id, response.status, await response.text());
      }

      const payload = (await response.json()) as GeminiResponse;
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!text) throw classifyHttpFailure(this.id, 502, 'Gemini returned an empty response.');

      return {
        text,
        providerId: this.id,
        model: this.config.model,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: payload.usageMetadata?.promptTokenCount,
          completionTokens: payload.usageMetadata?.candidatesTokenCount,
          totalTokens: payload.usageMetadata?.totalTokenCount,
        },
        attempted: [this.id],
      };
    } catch (error) {
      const normalized = normalizeThrown(this.id, error);
      this.logger.warn('Gemini request failed', {
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
