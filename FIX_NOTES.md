# JARVIS Node 22 — Full Electron + IPC Fix

## What was fixed

### 1. Electron desktop window
JARVIS is now launched by Electron after Vite is ready. The normal `npm run dev` command does not require the user to open localhost manually.

### 2. IPC preload bridge
The previous preload was a TypeScript/CommonJS preload running with Electron sandboxing. This could prevent the preload from initializing and left `window.jarvis` undefined.

A dedicated, self-contained `src/preload.cjs` is now used. It exposes only the approved IPC API through `contextBridge`.

Electron settings:
- contextIsolation: true
- nodeIntegration: false
- sandbox: false

### 3. Dev/prod preload paths
Development loads `app/backend/src/preload.cjs`.
Production loads `app/backend/dist/preload.cjs`.

### 4. Startup race
Vite is started first and the launcher waits for TCP port 5173 before Electron starts.

### 5. Visible diagnostics
Electron logs preload initialization, renderer load failures, and renderer console messages.

## Run

```powershell
npm install
npm run dev
```

Do not open `http://localhost:5173` yourself as the normal way to use JARVIS. That URL is only the renderer development server. The actual JARVIS application is the Electron window.

You can also run:

```powershell
.\RUN-JARVIS.bat
```

Do not use `npm audit fix --force` before boot verification.
