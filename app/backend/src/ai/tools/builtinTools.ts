import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { ToolDefinition } from '@backend/ai/tools/types';

/**
 * Deterministic, local, zero-cost tools. These are the operations JARVIS
 * should answer with *without* ever calling a cloud model.
 */

const NO_ARGS = { type: 'object', properties: {}, required: [] as string[] };

export const systemGetTime: ToolDefinition = {
  name: 'system.get_time',
  description: 'Returns the current local date and time of this machine.',
  parameters: NO_ARGS,
  risk: 'low',
  async execute() {
    const now = new Date();
    return { iso: now.toISOString(), local: now.toLocaleString(), timestamp: now.getTime() };
  },
};

export const systemGetInfo: ToolDefinition = {
  name: 'system.get_info',
  description: 'Returns CPU, memory, platform and uptime information for this machine.',
  parameters: NO_ARGS,
  risk: 'low',
  async execute() {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryGb: Number((os.totalmem() / 1024 ** 3).toFixed(2)),
      freeMemoryGb: Number((os.freemem() / 1024 ** 3).toFixed(2)),
      uptimeHours: Number((os.uptime() / 3600).toFixed(2)),
      hostname: os.hostname(),
    };
  },
};

export const filesList: ToolDefinition = {
  name: 'files.list',
  description: 'Lists the entries of a directory on this machine.',
  parameters: {
    type: 'object',
    properties: { directory: { type: 'string', description: 'Absolute or home-relative path.' } },
    required: ['directory'],
  },
  risk: 'low',
  policyAction: 'file.list',
  async execute(args) {
    const target = resolveHome(String(args.directory ?? os.homedir()));
    const entries = await fs.readdir(target, { withFileTypes: true });
    return {
      directory: target,
      entries: entries.slice(0, 200).map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      })),
    };
  },
};

export const filesExists: ToolDefinition = {
  name: 'files.exists',
  description: 'Checks whether a file or folder exists.',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  risk: 'low',
  async execute(args) {
    const target = resolveHome(String(args.path ?? ''));
    try {
      const stat = await fs.stat(target);
      return { path: target, exists: true, isDirectory: stat.isDirectory(), sizeBytes: stat.size };
    } catch {
      return { path: target, exists: false };
    }
  },
};

export const filesRead: ToolDefinition = {
  name: 'files.read',
  description: 'Reads the first part of a UTF-8 text file (max 20 KB).',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  risk: 'medium',
  policyAction: 'file.read',
  async execute(args) {
    const target = resolveHome(String(args.path ?? ''));
    const content = await fs.readFile(target, 'utf8');
    return { path: target, truncated: content.length > 20_000, content: content.slice(0, 20_000) };
  },
};

export const BUILTIN_TOOLS: readonly ToolDefinition[] = [
  systemGetTime,
  systemGetInfo,
  filesList,
  filesExists,
  filesRead,
];

function resolveHome(input: string): string {
  if (input.startsWith('~')) return path.join(os.homedir(), input.slice(1));
  return path.resolve(input);
}
