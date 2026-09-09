import { generateId } from '@backend/shared/utilities/generateId';
import { getActionPolicy } from '@backend/security/ActionPolicy';
import type { RiskLevel } from '@backend/security/types/SecurityTypes';
import type { ParsedIntent, TaskPlan, TaskStep } from '@backend/brain/types';

const APP_ALIASES: Record<string, string> = {
  chrome: 'chrome',
  'google chrome': 'chrome',
  browser: 'chrome',
  kivinjari: 'chrome',
  notepad: 'notepad',
  daftari: 'notepad',
  calculator: 'calculator',
  kikokotoo: 'calculator',
  'vs code': 'vscode',
  vscode: 'vscode',
  'visual studio code': 'vscode',
  code: 'vscode',
  explorer: 'explorer',
  'file explorer': 'explorer',
  terminal: 'terminal',
  cmd: 'terminal',
  powershell: 'terminal',
  spotify: 'spotify',
  word: 'word',
  excel: 'excel',
};

function riskOf(action: string): RiskLevel {
  return getActionPolicy(action)?.risk ?? 'medium';
}

function step(
  description: string,
  action: string | null,
  params: Record<string, unknown> = {},
): TaskStep {
  return {
    id: generateId(),
    description,
    action,
    params,
    risk: action ? riskOf(action) : 'low',
  };
}

export function normalizeAppName(raw: string): string {
  const key = raw.trim().toLowerCase();
  return APP_ALIASES[key] ?? key;
}

/**
 * Turns a parsed intent into an ordered, explicit plan (Milestone 5).
 *
 * Multi-step requests ("prepare my dev environment") become several
 * steps so the Action Executor can report progress and stop at the first
 * step that needs confirmation, instead of doing everything blindly.
 */
export class TaskPlanner {
  plan(intent: ParsedIntent): TaskPlan {
    const sw = intent.language === 'sw';
    const e = intent.entities;
    const build = (summary: string, steps: TaskStep[], reply: string | null = null): TaskPlan => ({
      id: generateId(),
      intent: intent.name,
      summary,
      steps,
      reply,
    });

    switch (intent.name) {
      case 'greeting':
        return build('Greet the user', [], sw ? 'Habari. Mimi ni JARVIS, niko tayari kukusaidia.' : "Hello. JARVIS here, ready when you are.");
      case 'farewell':
        return build('Say goodbye', [], sw ? 'Kwaheri. Nitakuwa hapa ukinihitaji.' : "Goodbye. I'll be here when you need me.");
      case 'thanks':
        return build('Acknowledge thanks', [], sw ? 'Karibu sana.' : "Anytime.");
      case 'identity':
        return build('Explain identity', [], sw
          ? 'Mimi ni JARVIS, msaidizi wako binafsi anayeishi kwenye kompyuta hii.'
          : 'I am JARVIS, your personal assistant running locally on this computer.');
      case 'help':
        return build('List capabilities', [], sw
          ? 'Naweza kudhibiti kompyuta, kufungua programu, kutafuta mafaili, kuvinjari mtandao, kusaidia kwenye code, na kukumbuka mambo yako.'
          : 'I can control your computer, open and close apps, manage files, browse and search the web, help with your code, and remember things for you.');
      case 'time_query':
        return build('Report time', [step('Read the system clock', 'system.time')]);
      case 'system_info':
        return build('Report system status', [step('Collect system metrics', 'system.info')]);
      case 'system_shutdown':
        return build('Shut down the computer', [step('Shut down Windows', 'system.shutdown')]);
      case 'system_restart':
        return build('Restart the computer', [step('Restart Windows', 'system.restart')]);
      case 'system_sleep':
        return build('Put the computer to sleep', [step('Sleep Windows', 'system.sleep')]);
      case 'system_lock':
        return build('Lock the computer', [step('Lock the workstation', 'system.lock')]);

      case 'app_open': {
        const app = normalizeAppName(e['app'] ?? '');
        return build(`Open ${app}`, [step(`Open ${app}`, 'app.open', { app })]);
      }
      case 'app_close': {
        const app = normalizeAppName(e['app'] ?? '');
        return build(`Close ${app}`, [step(`Close ${app}`, 'app.close', { app })]);
      }

      case 'file_search':
        return build('Search files', [step('Search the allowed folders', 'file.search', { query: e['query'] ?? '' })]);
      case 'file_list':
        return build('List files', [step('List folder contents', 'file.list', { folder: e['folder'] ?? 'documents' })]);
      case 'file_create_folder':
        return build('Create a folder', [step('Create the folder', 'file.createFolder', { name: e['name'] ?? 'New Folder' })]);
      case 'file_open':
        return build('Open a file', [step('Open the file', 'file.open', { path: e['path'] ?? '' })]);

      case 'browser_open':
        return build('Open a website', [step('Open the website', 'browser.open', { url: e['site'] ?? e['url'] ?? '' })]);
      case 'web_search':
        return build('Search the web', [step('Run a web search', 'browser.search', { query: e['query'] ?? '' })]);

      case 'coding_inspect':
        return build('Inspect the project', [step('Scan the project structure', 'coding.inspectProject', {})]);

      case 'prepare_dev_environment':
        return build('Prepare the development environment', [
          step('Open the code editor', 'app.open', { app: 'vscode' }),
          step('Open the browser', 'app.open', { app: 'chrome' }),
          step('Open a terminal', 'app.open', { app: 'terminal' }),
        ]);

      case 'memory_remember':
        return build('Store a memory', [
          step('Save to long-term memory', 'memory.write', {
            key: e['key'] ?? 'note',
            value: e['value'] ?? intent.utterance,
          }),
        ]);
      case 'memory_recall':
        return build('Recall a memory', [step('Search long-term memory', 'memory.read', { query: e['query'] ?? '' })]);
      case 'memory_forget':
        return build('Clear memory', [step('Erase stored memories', 'memory.delete', {})]);

      case 'unknown':
      default:
        return build('No matching capability', [], null);
    }
  }
}
