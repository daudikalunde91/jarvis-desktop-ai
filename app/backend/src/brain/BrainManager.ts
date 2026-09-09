import type { ILogger } from '@backend/logging/ILogger';
import type { ModuleStatus } from '@backend/shared/types/ModuleStatus';
import type { IHealthCheckable } from '@backend/shared/interfaces/IHealthCheckable';
import type { PermissionRole } from '@backend/security/types/SecurityTypes';
import type { MemoryManager } from '@backend/memory/MemoryManager';
import { RulesEngine } from '@backend/brain/RulesEngine';
import { TaskPlanner } from '@backend/brain/TaskPlanner';
import type { ActionExecutor } from '@backend/brain/ActionExecutor';
import { NullCloudReasoner, type ICloudReasoner } from '@backend/brain/CloudReasoner';
import type { BrainResponse, BrainSource, PlanExecution, TaskPlan } from '@backend/brain/types';

export interface BrainRequest {
  readonly sessionId: string;
  readonly utterance: string;
  readonly role?: PermissionRole;
  /** Set when the user is answering "yes" to a pending confirmation. */
  readonly confirmed?: boolean;
}

const SYSTEM_PROMPT =
  'You are JARVIS, a concise personal desktop assistant. Reply in the same language as the user ' +
  '(English or Swahili). Keep answers to one or two spoken sentences.';

/**
 * The Brain (Milestone 5) — the single entry point between voice/text
 * input and everything JARVIS can do.
 *
 * Order of resolution, by design:
 *   1. Rules Engine (offline, instant, private)
 *   2. Task Planner + Action Executor (permission-gated)
 *   3. Cloud reasoner, only for unmatched conversation and only if enabled
 */
export class BrainManager implements IHealthCheckable {
  private readonly pending = new Map<string, TaskPlan>();

  constructor(
    private readonly logger: ILogger,
    private readonly rules: RulesEngine,
    private readonly planner: TaskPlanner,
    private readonly executor: ActionExecutor,
    private readonly memory: MemoryManager,
    private readonly cloud: ICloudReasoner = new NullCloudReasoner(),
  ) {}

  hasPendingConfirmation(sessionId: string): boolean {
    return this.pending.has(sessionId);
  }

  cancelPending(sessionId: string): void {
    this.pending.delete(sessionId);
  }

  async handle(request: BrainRequest): Promise<BrainResponse> {
    const utterance = request.utterance.trim();
    this.memory.recordTurn(request.sessionId, 'user', utterance);

    // 1. Is the user answering a pending "are you sure?"
    const awaiting = this.pending.get(request.sessionId);
    if (awaiting) {
      const answer = this.readConfirmation(utterance);
      if (answer === 'yes') {
        this.pending.delete(request.sessionId);
        return this.runPlan(request, awaiting, this.rules.parse(utterance), true);
      }
      if (answer === 'no') {
        this.pending.delete(request.sessionId);
        const intent = this.rules.parse(utterance);
        const reply = intent.language === 'sw' ? 'Sawa, nimeacha.' : 'Understood, I have cancelled that.';
        return this.reply(request, reply, intent, 'rules', awaiting, null);
      }
    }

    // 2. Offline rules.
    const intent = this.rules.parse(utterance);
    const plan = this.planner.plan(intent);

    if (plan.steps.length > 0) {
      return this.runPlan(request, plan, intent, request.confirmed === true);
    }

    if (plan.reply) {
      return this.reply(request, plan.reply, intent, 'rules', plan, null);
    }

    // 3. Cloud fallback for open conversation only.
    if (this.cloud.isAvailable()) {
      try {
        const history = this.memory.getShortTerm(request.sessionId).map((turn) => ({
          role: turn.role,
          content: turn.text,
        }));
        const answer = await this.cloud.complete({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        });
        return this.reply(request, answer, intent, 'cloud', null, null);
      } catch {
        // Fall through to the offline apology below.
      }
    }

    const fallback =
      intent.language === 'sw'
        ? 'Samahani, sijaelewa hilo. Unaweza kuniambia kwa njia nyingine?'
        : "I'm not sure how to help with that yet. Could you say it another way?";
    return this.reply(request, fallback, intent, 'rules', null, null);
  }

  private async runPlan(
    request: BrainRequest,
    plan: TaskPlan,
    intent: ReturnType<RulesEngine['parse']>,
    confirmed: boolean,
  ): Promise<BrainResponse> {
    const execution = await this.executor.execute(plan, {
      sessionId: request.sessionId,
      role: request.role,
      confirmed,
    });

    if (execution.pendingConfirmation) {
      this.pending.set(request.sessionId, plan);
      return this.reply(
        request,
        execution.pendingConfirmation.message,
        intent,
        'rules',
        plan,
        execution,
      );
    }

    this.pending.delete(request.sessionId);
    const spoken = execution.outcomes
      .filter((outcome) => outcome.status !== 'skipped')
      .map((outcome) => outcome.message)
      .join(' ');

    return this.reply(request, spoken || plan.summary, intent, 'rules', plan, execution);
  }

  private reply(
    request: BrainRequest,
    text: string,
    intent: ReturnType<RulesEngine['parse']>,
    source: BrainSource,
    plan: TaskPlan | null,
    execution: PlanExecution | null,
  ): BrainResponse {
    this.memory.recordTurn(request.sessionId, 'assistant', text);
    this.logger.debug('Brain response', { intent: intent.name, source });
    return {
      sessionId: request.sessionId,
      utterance: request.utterance,
      reply: text,
      intent,
      source,
      plan,
      execution,
    };
  }

  private readConfirmation(utterance: string): 'yes' | 'no' | 'unclear' {
    const text = utterance.trim().toLowerCase();
    if (/^(yes|yeah|yep|sure|do it|go ahead|confirm|ndio|ndiyo|sawa|endelea)\b/.test(text)) return 'yes';
    if (/^(no|nope|cancel|stop|don'?t|hapana|acha|sitisha)\b/.test(text)) return 'no';
    return 'unclear';
  }

  healthCheck(): ModuleStatus {
    return this.executor.healthCheck();
  }
}
