const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 5173;
const children = [];

function start(args, label) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: false,
    shell: process.platform === 'win32',
  });
  children.push({ child, label });
  child.on('error', (error) => console.error(`[${label}] spawn error:`, error));
  child.on('exit', (code, signal) => {
    if (code !== 0 && signal == null) console.error(`[${label}] exited with code ${code}`);
  });
  return child;
}

function waitForPort(host, port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host, port });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Vite did not become ready at http://${host}:${port}`));
        } else setTimeout(probe, 250);
      });
    };
    probe();
  });
}

async function main() {
  console.log('[JARVIS] 1/3 bootstrap');
  const bootstrap = start(['run', 'bootstrap'], 'bootstrap');
  const code = await new Promise((resolve) => bootstrap.once('exit', (c) => resolve(c ?? 1)));
  if (code !== 0) throw new Error(`bootstrap exited with code ${code}`);

  console.log('[JARVIS] 2/3 frontend');
  start(['run', 'dev', '--workspace=jarvis-frontend', '--', '--host', HOST], 'frontend');
  await waitForPort(HOST, PORT);

  console.log('[JARVIS] 3/3 electron');
  start(['run', 'dev', '--workspace=jarvis-backend'], 'electron');
}

function cleanup(code = 0) {
  for (const { child } of children) {
    if (!child.killed) { try { child.kill(); } catch {} }
  }
  process.exit(code);
}
process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
main().catch((error) => {
  console.error('[JARVIS] STARTUP FAILED:', error.message);
  cleanup(1);
});
