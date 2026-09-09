/**
 * Normalized provider errors.
 *
 * Every adapter converts its vendor-specific failure into one of these so
 * the orchestrator can make routing decisions without knowing whether the
 * call went to OpenAI, Gemini or Claude.
 */

export const PROVIDER_ERROR_CATEGORIES = [
  'authentication',
  'rate_limit',
  'quota_exceeded',
  'timeout',
  'network',
  'model_unavailable',
  'invalid_request',
  'unknown',
] as const;

export type ProviderErrorCategory = (typeof PROVIDER_ERROR_CATEGORIES)[number];

export class ProviderError extends Error {
  constructor(
    public readonly category: ProviderErrorCategory,
    message: string,
    public readonly providerId: string,
    public readonly statusCode?: number,
    /** True when trying another provider is likely to succeed. */
    public readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthenticationError extends ProviderError {
  constructor(providerId: string, message = 'Provider rejected the credentials.', status?: number) {
    super('authentication', message, providerId, status, false);
  }
}

export class RateLimitError extends ProviderError {
  constructor(providerId: string, message = 'Provider rate limit reached.', status = 429) {
    super('rate_limit', message, providerId, status, true);
  }
}

export class QuotaExceededError extends ProviderError {
  constructor(providerId: string, message = 'Provider quota exceeded.', status?: number) {
    super('quota_exceeded', message, providerId, status, true);
  }
}

export class TimeoutError extends ProviderError {
  constructor(providerId: string, message = 'Provider request timed out.') {
    super('timeout', message, providerId, undefined, true);
  }
}

export class NetworkError extends ProviderError {
  constructor(providerId: string, message = 'Network failure talking to provider.') {
    super('network', message, providerId, undefined, true);
  }
}

export class ModelUnavailableError extends ProviderError {
  constructor(providerId: string, message = 'Requested model is unavailable.', status?: number) {
    super('model_unavailable', message, providerId, status, true);
  }
}

export class InvalidRequestError extends ProviderError {
  constructor(providerId: string, message = 'Provider rejected the request.', status?: number) {
    super('invalid_request', message, providerId, status, false);
  }
}

/** Raised when no provider could answer. Never pretend an AI replied. */
export class NoProviderAvailableError extends Error {
  constructor(
    message = 'No AI provider is currently available.',
    public readonly attempted: readonly string[] = [],
  ) {
    super(message);
    this.name = 'NoProviderAvailableError';
  }
}

/** Cooldown applied to a provider after each failure category. */
export const COOLDOWN_MS: Record<ProviderErrorCategory, number> = {
  authentication: 15 * 60_000,
  rate_limit: 60_000,
  quota_exceeded: 30 * 60_000,
  timeout: 30_000,
  network: 30_000,
  model_unavailable: 10 * 60_000,
  invalid_request: 0,
  unknown: 60_000,
};

/** Maps an HTTP status + body snippet onto a normalized error. */
export function classifyHttpFailure(
  providerId: string,
  status: number,
  bodyText: string,
): ProviderError {
  const body = bodyText.slice(0, 500);
  const lower = body.toLowerCase();

  if (status === 401 || status === 403) return new AuthenticationError(providerId, body, status);
  if (status === 429) {
    return lower.includes('quota') || lower.includes('billing') || lower.includes('insufficient')
      ? new QuotaExceededError(providerId, body, status)
      : new RateLimitError(providerId, body, status);
  }
  if (status === 404) return new ModelUnavailableError(providerId, body, status);
  if (status === 400 || status === 422) return new InvalidRequestError(providerId, body, status);
  if (status === 408 || status === 504) return new TimeoutError(providerId, body);
  if (status >= 500) return new ModelUnavailableError(providerId, body, status);
  return new ProviderError('unknown', body || `HTTP ${status}`, providerId, status, true);
}

export function normalizeThrown(providerId: string, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === 'AbortError') {
    return new TimeoutError(providerId, 'Request aborted or timed out.');
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(message)) {
    return new NetworkError(providerId, message);
  }
  return new ProviderError('unknown', message, providerId, undefined, true);
}
