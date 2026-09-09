import { describe, expect, it } from 'vitest';

import { createTestLogger } from '../support/testLogger';
import { ToolRegistry } from '@backend/ai/tools/ToolRegistry';
import { ToolExecutor } from '@backend/ai/tools/ToolExecutor';
import { BUILTIN_TOOLS } from '@backend/ai/tools/builtinTools';
import { ContextManager } from '@backend/ai/orchestrator/ContextManager';

function buildExecutor() {
  const registry = new ToolRegistry();
  BUILTIN_TOOLS.forEach((tool) => registry.register(tool));
  return { registry, executor: new ToolExecutor(createTestLogger(), registry) };
}

describe('tool calling abstraction', () => {
  it('executes a low-risk tool without confirmation', async () => {
    const { executor } = buildExecutor();
    const result = await executor.execute(
      { id: '1', name: 'system.get_time', args: {} },
      { sessionId: 'test' },
    );
    expect(result.status).toBe('ok');
  });

  it('requires confirmation before a medium-risk tool runs', async () => {
    const { executor } = buildExecutor();
    const result = await executor.execute(
      { id: '2', name: 'files.read', args: { path: './package.json' } },
      { sessionId: 'test' },
    );
    expect(result.status).toBe('awaiting-confirmation');
  });

  it('rejects tools the model invents', async () => {
    const { executor } = buildExecutor();
    const result = await executor.execute(
      { id: '3', name: 'os.format_disk', args: {} },
      { sessionId: 'test' },
    );
    expect(result.status).toBe('unknown-tool');
  });

  it('exposes schemas without executable code', () => {
    const { registry } = buildExecutor();
    const schemas = registry.toSchemas();
    expect(schemas.length).toBe(BUILTIN_TOOLS.length);
    expect(Object.keys(schemas[0])).toEqual(['name', 'description', 'parameters']);
  });
});

describe('ContextManager', () => {
  it('trims history instead of sending unbounded transcripts', () => {
    const context = new ContextManager({ maxMessages: 3, maxCharacters: 1000 });
    for (let index = 0; index < 10; index += 1) {
      context.append('s1', { role: 'user', content: `message ${index}` });
    }
    const prompt = context.buildPrompt('s1', 'system prompt');
    expect(prompt).toHaveLength(4); // system + 3 trimmed messages
    expect(prompt[0].role).toBe('system');
  });

  it('keeps sessions isolated', () => {
    const context = new ContextManager({ maxMessages: 5, maxCharacters: 1000 });
    context.append('a', { role: 'user', content: 'hello' });
    expect(context.get('b').messages).toHaveLength(0);
  });
});
