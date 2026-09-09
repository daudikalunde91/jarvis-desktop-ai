import type {
  AiCompletionRequest,
  AiCompletionResult,
  ProviderCapabilities,
} from '@backend/ai/types';

/**
 * Contract every AI vendor adapter implements. Adapters are pure request
 * translators: no routing, no fallback, no permission logic.
 */
export interface IAIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  /** Enabled in configuration. */
  isEnabled(): boolean;
  /** Enabled AND holds the credentials it needs. */
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
