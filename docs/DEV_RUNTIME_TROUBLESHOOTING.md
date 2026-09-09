# JARVIS Development Runtime Troubleshooting

## Electron + SQLite

JARVIS uses `better-sqlite3`, a native Node module. Electron has its own Node ABI, so the module must be rebuilt for the repository Electron version. The root `postinstall` script performs this automatically:

```powershell
pnpm install
```

If a stale native binary remains, force a rebuild:

```powershell
pnpm exec electron-rebuild -f -w better-sqlite3
```

## Development startup

The backend development command builds the backend first so `dist/preload.js` exists, then starts Electron. The preload is intentionally compiled JavaScript because Electron's preload loader does not directly execute the TypeScript source entry.

```powershell
pnpm dev
```
