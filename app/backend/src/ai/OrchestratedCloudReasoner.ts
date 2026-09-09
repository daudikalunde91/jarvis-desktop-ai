import type { ILogger } from '@backend/logging/ILogger';
import type { CloudRequest, ICloudReasoner } from '@backend/brain/CloudReasoner';
import type { AIOrchestrator } from '@backend/ai/orchestrator/AIOrchestrator';
import { classifyTask } from '@backend/ai/TaskClassifier';

/**
 * Adapter that plugs the M5 AI orchestrator into the existing BrainManager
 * `ICloudReasoner` extension point. No BrainManager rewrite required: the
 * rules engine still answers first, and this is only consulted for
 * open-ended reasoning.
 */
export class OrchestratedCloudReasoner implements ICloudReasoner {
  public readonly id = 'ai-orchestrator';

  constructor(
    private readonly logger: ILogger,
    private readonly orchestrator: AIOrchestrator,
  ) {}

  isAvailable(): boolean {
    return this.orchestrator.isAvailable();
  }

  async complete(request: CloudRequest): Promise<string> {
    const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
    const taskType = classifyTask(lastUser?.content ?? '');

    const result = await this.orchestrator.complete({
      messages: request.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      taskType,
      signal: request.signal,
    });

    this.logger.debug('Reasoning answered by provider', {
      provider: result.providerId,
      taskType,
    });
    return result.text;
  }
}
