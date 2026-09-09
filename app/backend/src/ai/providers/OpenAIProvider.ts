import type { ILogger } from '@backend/logging/ILogger';
import type { ProviderConfig } from '@backend/ai/config/AiConfig';
import type { IAIProvider } from '@backend/ai/interfaces/IAIProvider';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiToolRequest,
  ProviderCapabilities,
} from '@backend/ai/types';
import { classifyHttpFailure, normalizeThrown } from '@backend/ai/errors/ProviderError';

interface ChatChoice {
  message?: {
    content?: string | null;
    tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
  };
}

interface ChatResponse {
  choices?: ChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * OpenAI (and any OpenAI-compatible gateway) adapter.
 * Also reused by the local provider, which speaks the same wire format.
 */
export class OpenAIProvider implements IAIProvider {
  public readonly capabilities: ProviderCapabilities = {
    reasoning: true,
    coding: true,
    vision: true,
    toolCalling: true,
    streaming: true,
  };

  constructor(
    protected readonly logger: ILogger,
    protected readonly config: ProviderConfig,
    public readonly id: string = 'openai',
    public readonly label: string = 'OpenAI',
  ) {}

  get model(): string {
    return this.config.model;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isConfigured(): boolean {
    return this.config.enabled && Boolean(this.config.apiKey && this.config.baseUrl && this.config.model);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    request.signal?.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          temperature: request.temperature ?? 0.4,
          max_tokens: request.maxOutputTokens ?? 800,
          messages: request.messages.map((message) => {
            if (!message.images?.length) return { role: message.role, content: message.content };
            return {
              role: message.role,
              content: [
                { type: 'text', text: message.content },
                ...message.images.map((image) => ({
                  type: 'image_url',
                  image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
                })),
              ],
            };
          }),
          ...(request.tools?.length
            ? {
                tools: request.tools.map((tool) => ({
                  type: 'function',
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  },
                })),
              }
            : {}),
        }),
      });

      if (!response.ok) {
        throw classifyHttpFailure(this.id, response.status, await response.text());
      }

      const payload = (await response.json()) as ChatResponse;
      const choice = payload.choices?.[0];
      const toolRequests: AiToolRequest[] = (choice?.message?.tool_calls ?? []).map((call, index) => ({
        id: call.id ?? `${this.id}-tool-${index}`,
        name: call.function?.name ?? 'unknown',
        args: safeParse(call.function?.arguments),
      }));
      const text = (choice?.message?.content ?? '').trim();

      if (!text && toolRequests.length === 0) {
        throw classifyHttpFailure(this.id, 502, 'Provider returned an empty response.');
      }

      return {
        text,
        providerId: this.id,
        model: this.config.model,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: payload.usage?.prompt_tokens,
          completionTokens: payload.usage?.completion_tokens,
          totalTokens: payload.usage?.total_tokens,
        },
        toolRequests,
        attempted: [this.id],
      };
    } catch (error) {
      throw normalizeThrown(this.id, error);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function safeParse(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
