import type { AiTaskType } from '@backend/ai/types';

const CODING = /\b(code|typescript|javascript|python|error|exception|stack trace|compile|bug|refactor|function|api|regex|sql|hitilafu|msimbo)\b/i;
const SUMMARY = /\b(summar\w*|tldr|shorten|fupisha|muhtasari)\b/i;
const PLANNING = /\b(plan|steps|workflow|organi[sz]e|schedule|mpango|hatua)\b/i;

/**
 * Cheap, local, zero-cost classification of what kind of model a request
 * needs. Used only to pick a provider priority list — never to decide
 * whether AI is used at all (that is the local-first decision layer).
 */
export function classifyTask(utterance: string, hasImages = false): AiTaskType {
  if (hasImages) return 'multimodal';
  if (CODING.test(utterance)) return 'coding';
  if (SUMMARY.test(utterance)) return 'summarization';
  if (PLANNING.test(utterance)) return 'planning';
  return 'general';
}
