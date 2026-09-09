import type { AiToolSchema } from '@backend/ai/types';
import type { ToolDefinition } from '@backend/ai/tools/types';

/**
 * The only surface an AI model may ask JARVIS to act through. Models never
 * receive shell access — they can request a named tool, nothing else.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): readonly ToolDefinition[] {
    return [...this.tools.values()];
  }

  /** Schemas handed to a provider that supports tool calling. */
  toSchemas(): readonly AiToolSchema[] {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}
