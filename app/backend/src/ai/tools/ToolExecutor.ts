import type { ILogger } from '@backend/logging/ILogger';
import type { IPermissionManager } from '@backend/security/interfaces/IPermissionManager';
import { CONFIRMATION_REQUIRED_RISKS } from '@backend/security/types/SecurityTypes';
import type { AiToolRequest } from '@backend/ai/types';
import type { ToolRegistry } from '@backend/ai/tools/ToolRegistry';
import type { ToolContext, ToolResult } from '@backend/ai/tools/types';

/**
 * AI -> tool request -> permission check -> execution -> result.
 * The model's output is a *request*; this class is the only thing that runs.
 */
export class ToolExecutor {
  constructor(
    private readonly logger: ILogger,
    private readonly registry: ToolRegistry,
    private readonly permissions?: IPermissionManager,
  ) {}

  async execute(request: AiToolRequest, context: ToolContext): Promise<ToolResult> {
    const tool = this.registry.get(request.name);
    if (!tool) {
      return {
        tool: request.name,
        status: 'unknown-tool',
        message: `JARVIS has no tool named "${request.name}".`,
      };
    }

    const needsConfirmation = CONFIRMATION_REQUIRED_RISKS.includes(tool.risk);

    if (this.permissions && tool.policyAction) {
      const decision = this.permissions.evaluate(tool.policyAction, {
        role: context.role,
        confirmed: context.confirmed,
      });
      if (!decision.allowed) {
        return { tool: tool.name, status: 'denied', message: decision.reason };
      }
      if (decision.requiresConfirmation && !context.confirmed) {
        return {
          tool: tool.name,
          status: 'awaiting-confirmation',
          message: `"${tool.name}" needs your confirmation before JARVIS runs it.`,
        };
      }
    } else if (needsConfirmation && !context.confirmed) {
      return {
        tool: tool.name,
        status: 'awaiting-confirmation',
        message: `"${tool.name}" is a ${tool.risk}-risk tool and needs your confirmation.`,
      };
    }

    try {
      const data = await tool.execute(request.args ?? {}, context);
      this.logger.debug('Tool executed', { tool: tool.name, risk: tool.risk });
      return { tool: tool.name, status: 'ok', message: `${tool.name} completed.`, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Tool execution failed', { tool: tool.name });
      return { tool: tool.name, status: 'error', message };
    }
  }
}
