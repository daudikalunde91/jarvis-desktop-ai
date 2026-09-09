import type { IpcRouter } from '@backend/ipc/IpcRouter';
import type { IConfigManager } from '@backend/config/IConfigManager';
import type { BrainManager } from '@backend/brain/BrainManager';
import { registerSystemHandlers } from '@backend/ipc/handlers/systemHandlers';
import { registerBrainHandlers } from '@backend/ipc/handlers/brainHandlers';
import { registerAiHandlers } from '@backend/ipc/handlers/aiHandlers';
import type { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import type { ToolRegistry } from '@backend/ai/tools/ToolRegistry';

/** Single composition point for renderer-facing IPC handler groups. */
export function registerIpc(
  router: IpcRouter,
  configManager: IConfigManager,
  brainManager: BrainManager,
  aiOrchestrator?: AIOrchestrator,
  aiTools?: ToolRegistry,
): void {
  registerSystemHandlers(router, configManager, brainManager);
  registerBrainHandlers(router, brainManager);
  if (aiOrchestrator && aiTools) {
    registerAiHandlers(router, aiOrchestrator, aiTools);
  }
}
