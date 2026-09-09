/**
 * Renderer-side IPC client.
 * Thin wrapper around the context-isolated Electron bridge.
 */
function bridge() {
  if (!window.jarvis) {
    throw new Error(
      'JARVIS IPC bridge is unavailable. The Electron preload script did not initialize.',
    );
  }
  return window.jarvis;
}

export const ipcClient = {
  ping: () => bridge().ping(),
  getAppInfo: () => bridge().getAppInfo(),
  getConfig: () => bridge().getConfig(),
  handleBrain: (utterance: string, sessionId = 'desktop') =>
    bridge().handleBrain({ utterance, sessionId }),
  getHealth: () => bridge().getHealth(),
  getAiStatus: () => bridge().getAiStatus(),
  listAiTools: () => bridge().listAiTools(),
};

export type IpcClient = typeof ipcClient;
