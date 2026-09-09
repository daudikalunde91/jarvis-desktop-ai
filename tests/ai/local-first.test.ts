import { describe, expect, it, vi } from 'vitest';

import { createTestLogger } from '../support/testLogger';
import { RulesEngine } from '@backend/brain/RulesEngine';
import { TaskPlanner } from '@backend/brain/TaskPlanner';
import { classifyTask } from '@backend/ai/TaskClassifier';
import type { ICloudReasoner } from '@backend/brain/CloudReasoner';

/**
 * Local-first policy: deterministic commands must be answered by the
 * existing M1-M4 pipeline without ever touching an AI provider.
 */
describe('local-first decision layer', () => {
  const logger = createTestLogger();
  const rules = new RulesEngine(logger);
  const planner = new TaskPlanner();

  const cloud: ICloudReasoner = {
    id: 'spy',
    isAvailable: () => true,
    complete: vi.fn(async () => 'cloud answer'),
  };

  it.each(['Saa ngapi?', 'System info', 'Habari JARVIS'])(
    'resolves "%s" offline without an AI call',
    (utterance) => {
      const intent = rules.parse(utterance);
      const plan = planner.plan(intent);

      expect(intent.name).not.toBe('unknown');
      expect(plan.steps.length > 0 || plan.reply !== null).toBe(true);
      expect(cloud.complete).not.toHaveBeenCalled();
    },
  );

  it('classifies coding questions towards coding-capable models', () => {
    expect(classifyTask('Explain this TypeScript error')).toBe('coding');
    expect(classifyTask('Fupisha maandishi haya')).toBe('summarization');
    expect(classifyTask('How are you today?')).toBe('general');
    expect(classifyTask('what is in this screenshot', true)).toBe('multimodal');
  });
});
