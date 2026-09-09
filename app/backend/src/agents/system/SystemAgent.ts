import os from 'node:os';

import type { ILogger } from '@backend/logging/ILogger';
import type { ModuleStatus } from '@backend/shared/types/ModuleStatus';
import type { ICommandRunner } from '@backend/agents/runtime/ShellCommandRunner';
import {
  fail,
  ok,
  requiredString,
  type ActionRequest,
  type ActionResult,
  type IActionAgent,
} from '@backend/agents/types';

/** Friendly name -> Windows executable, used by `app.open`. */
export const KNOWN_APPLICATIONS: Record<string, string> = {
  chrome: 'chrome',
  edge: 'msedge',
  firefox: 'firefox',
  notepad: 'notepad',
  calculator: 'calc',
  explorer: 'explorer',
  'file explorer': 'explorer',
  vscode: 'code',
  'visual studio code': 'code',
  terminal: 'wt',
  cmd: 'cmd',
  powershell: 'powershell',
  word: 'winword',
  excel: 'excel',
  spotify: 'spotify',
  settings: 'ms-settings:',
};

/**
 * Windows Control Agent (Milestone 4).
 *
 * Executes system-level operations through the injected
 * `ICommandRunner`. It performs no permission checks itself — that is
 * the Action Executor + Permission Manager's job, one layer above.
 */
export class SystemAgent implements IActionAgent {
  public readonly id = 'system-agent';
  public readonly actions = [
    'system.info',
    'system.time',
    'system.lock',
    'system.sleep',
    'system.restart',
    'system.shutdown',
    'app.open',
    'app.close',
  ] as const;

  constructor(
    private readonly logger: ILogger,
    private readonly runner: ICommandRunner,
  ) {}

  async execute(request: ActionRequest): Promise<ActionResult> {
    switch (request.action) {
      case 'system.info':
        return this.systemInfo();
      case 'system.time':
        return this.currentTime();
      case 'system.lock':
        return this.simple('system.lock', 'rundll32.exe', ['user32.dll,LockWorkStation'], 'Computer locked.');
      case 'system.sleep':
        return this.simple(
          'system.sleep',
          'rundll32.exe',
          ['powrprof.dll,SetSuspendState', '0,1,0'],
          'Putting the computer to sleep.',
        );
      case 'system.restart':
        return this.simple('system.restart', 'shutdown.exe', ['/r', '/t', '5'], 'Restarting the computer.');
      case 'system.shutdown':
        return this.simple('system.shutdown', 'shutdown.exe', ['/s', '/t', '5'], 'Shutting the computer down.');
      case 'app.open':
        return this.openApp(request);
      case 'app.close':
        return this.closeApp(request);
      default:
        return fail(request.action, `SystemAgent cannot handle action "${request.action}"`);
    }
  }

  private async currentTime(): Promise<ActionResult> {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return ok('system.time', `It is ${time} on ${date}.`, { iso: now.toISOString(), time, date });
  }

  private async systemInfo(): Promise<ActionResult> {
    const totalGb = os.totalmem() / 1024 ** 3;
    const freeGb = os.freemem() / 1024 ** 3;
    const data = {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      cpuCores: os.cpus().length,
      totalMemoryGb: Number(totalGb.toFixed(2)),
      freeMemoryGb: Number(freeGb.toFixed(2)),
      memoryUsedPercent: Number((((totalGb - freeGb) / totalGb) * 100).toFixed(1)),
      uptimeHours: Number((os.uptime() / 3600).toFixed(2)),
    };
    return ok(
      'system.info',
      `${data.cpuCores} CPU cores, ${data.freeMemoryGb} GB of ${data.totalMemoryGb} GB memory free (${data.memoryUsedPercent}% used).`,
      data,
    );
  }

  private async simple(
    action: string,
    command: string,
    args: string[],
    successMessage: string,
  ): Promise<ActionResult> {
    const result = await this.runner.run(command, args);
    if (!result.ok) {
      this.logger.error(`System action failed: ${action}`, { stderr: result.stderr });
      return fail(action, `Could not complete ${action}: ${result.stderr || 'unknown error'}`);
    }
    return ok(action, result.simulated ? `${successMessage} (simulated)` : successMessage, {
      simulated: result.simulated,
    });
  }

  private async openApp(request: ActionRequest): Promise<ActionResult> {
    const name = requiredString(request.params, 'app');
    if (!name) return fail('app.open', 'No application name was provided.');

    const executable = KNOWN_APPLICATIONS[name.toLowerCase()];
    if (!executable) {
      return fail('app.open', `I do not have a safe application profile for "${name}" yet.`);
    }
    const result = await this.runner.run('cmd.exe', ['/c', 'start', '', executable]);
    if (!result.ok) return fail('app.open', `I could not open ${name}.`);
    return ok('app.open', `Opening ${name}.`, { executable, simulated: result.simulated });
  }

  private async closeApp(request: ActionRequest): Promise<ActionResult> {
    const name = requiredString(request.params, 'app');
    if (!name) return fail('app.close', 'No application name was provided.');

    const executable = KNOWN_APPLICATIONS[name.toLowerCase()];
    if (!executable || executable.endsWith(':')) {
      return fail('app.close', `I do not have a safe application profile for "${name}" yet.`);
    }
    const result = await this.runner.run('taskkill.exe', ['/IM', `${executable}.exe`, '/F']);
    if (!result.ok) return fail('app.close', `I could not close ${name}.`);
    return ok('app.close', `Closing ${name}.`, { executable, simulated: result.simulated });
  }

  healthCheck(): ModuleStatus {
    return 'running';
  }
}
