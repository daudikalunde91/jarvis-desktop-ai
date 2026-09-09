import type { ILogger } from '@backend/logging/ILogger';
import type { ProviderConfig } from '@backend/ai/config/AiConfig';
import { OpenAIProvider } from '@backend/ai/providers/OpenAIProvider';
import type { ProviderCapabilities } from '@backend/ai/types';

/**
 * Local engine adapter (Ollama, LM Studio, llama.cpp server — anything that
 * exposes an OpenAI-compatible `/chat/completions`). Disabled by default and
 * always last in the priority list, so JARVIS can keep reasoning without any
 * cloud account when the user runs a local model.
 */
export class LocalProvider extends OpenAIProvider {
  public override readonly capabilities: ProviderCapabilities = {
    reasoning: true,
    coding: true,
    vision: false,
    toolCalling: false,
    streaming: true,
  };

  constructor(logger: ILogger, config: ProviderConfig) {
    super(logger, config, 'local', 'Local Engine');
  }

  override isConfigured(): boolean {
    return this.config.enabled && Boolean(this.config.baseUrl && this.config.model);
  }
}
