import type { IpcRouter } from '@backend/ipc/IpcRouter';
import { IPC_CHANNELS } from '@backend/ipc/channels';
import type { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import type { ToolRegistry } from '@backend/ai/tools/ToolRegistry';

/**
 * Renderer-facing AI status surface. Deliberately read-only and
 * secret-free: no API keys, base URLs or prompts ever cross the bridge.
 */
export function registerAiHandlers(
  router: IpcRouter,
  orchestrator: AIOrchestrator,
  tools: ToolRegistry,
): void {
  router.handle(IPC_CHANNELS.AI_GET_STATUS, () => orchestrator.getHealthSummary());

  router.handle(IPC_CHANNELS.AI_LIST_TOOLS, () =>
    tools.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      risk: tool.risk,
    })),
  );
}
