const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = Object.freeze({
  SYSTEM_GET_APP_INFO: 'system:get-app-info',
  SYSTEM_PING: 'system:ping',
  CONFIG_GET_ALL: 'config:get-all',
  BRAIN_HANDLE: 'brain:handle',
  SYSTEM_GET_HEALTH: 'system:get-health',
  AI_GET_STATUS: 'system:ai-status',
  AI_LIST_TOOLS: 'system:ai-tools',
});

try {
  console.log('[JARVIS PRELOAD] initialized');
  const bridge = {
    ping: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_PING),
    getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_APP_INFO),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_ALL),
    handleBrain: (request) => ipcRenderer.invoke(IPC_CHANNELS.BRAIN_HANDLE, request),
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_HEALTH),
    getAiStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_STATUS),
    listAiTools: () => ipcRenderer.invoke(IPC_CHANNELS.AI_LIST_TOOLS),
  };

  contextBridge.exposeInMainWorld('jarvis', bridge);
  console.log('[JARVIS PRELOAD] window.jarvis exposed');
} catch (error) {
  console.error('[JARVIS PRELOAD] FAILED:', error);
}
