import { InjectionToken } from '@backend/shared/types/Token';
import type { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import type { ProviderRegistry } from '@backend/ai/orchestrator/ProviderRegistry';
import type { ProviderHealthManager } from '@backend/ai/orchestrator/ProviderHealthManager';
import type { ContextManager } from '@backend/ai/orchestrator/ContextManager';
import type { UsageTracker } from '@backend/ai/orchestrator/UsageTracker';
import type { ToolRegistry } from '@backend/ai/tools/ToolRegistry';
import type { ToolExecutor } from '@backend/ai/tools/ToolExecutor';

export const AI_TOKENS = {
  AIOrchestrator: new InjectionToken<AIOrchestrator>('AIOrchestrator'),
  ProviderRegistry: new InjectionToken<ProviderRegistry>('AiProviderRegistry'),
  ProviderHealthManager: new InjectionToken<ProviderHealthManager>('AiProviderHealthManager'),
  ContextManager: new InjectionToken<ContextManager>('AiContextManager'),
  UsageTracker: new InjectionToken<UsageTracker>('AiUsageTracker'),
  ToolRegistry: new InjectionToken<ToolRegistry>('AiToolRegistry'),
  ToolExecutor: new InjectionToken<ToolExecutor>('AiToolExecutor'),
} as const;
