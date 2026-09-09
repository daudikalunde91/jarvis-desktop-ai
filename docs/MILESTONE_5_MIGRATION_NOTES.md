# Milestone 5 — Migration notes and file-by-file change summary

## Upgrading an existing checkout

1. `npm install` (Node.js 22.x, npm — pnpm was **not** introduced).
2. Copy the new AI block from `.env.example` into your `.env` and paste the
   API keys you want to use. Every key is optional: with none set, JARVIS runs
   exactly as it did in M4 (rules + agents, fully offline).
3. `npm run build` then `npm start` — no database migration is required.

Behaviour with no keys configured: the AI panel shows every provider as
`NOT CONFIGURED`, and unmatched conversation gets the existing offline
apology instead of an invented answer.

## New files

| File | Purpose |
| --- | --- |
| `app/backend/src/ai/types.ts` | Provider-agnostic AI vocabulary |
| `app/backend/src/ai/errors/ProviderError.ts` | Normalized errors + cooldown table |
| `app/backend/src/ai/config/AiConfig.ts` | Models, base URLs, priorities (no hardcoded model ids elsewhere) |
| `app/backend/src/ai/interfaces/IAIProvider.ts` | Adapter contract |
| `app/backend/src/ai/providers/OpenAIProvider.ts` | OpenAI / OpenAI-compatible adapter |
| `app/backend/src/ai/providers/GeminiProvider.ts` | Google Gemini adapter |
| `app/backend/src/ai/providers/ClaudeProvider.ts` | Anthropic Claude adapter |
| `app/backend/src/ai/providers/LocalProvider.ts` | Local engine (Ollama / LM Studio) |
| `app/backend/src/ai/orchestrator/*` | Registry, router, health, fallback, context, usage, orchestrator |
| `app/backend/src/ai/tools/*` | Tool registry, permission-checked executor, built-in tools |
| `app/backend/src/ai/TaskClassifier.ts` | Local, free task-type classification |
| `app/backend/src/ai/OrchestratedCloudReasoner.ts` | Adapter into the existing `ICloudReasoner` point |
| `app/backend/src/ai/AiFactory.ts` | Composition root (DI friendly) |
| `app/backend/src/ai/tokens.ts`, `index.ts` | DI tokens and barrel |
| `app/backend/src/ipc/handlers/aiHandlers.ts` | Read-only AI status IPC |
| `app/backend/src/database/DatabaseManager.ts` | Restored: the file was missing from the handover archive and broke the backend build |
| `docs/MILESTONE_5_AI_BRAIN.md` | Architecture documentation |
| `tests/ai/*.test.ts` | 19 new tests |

## Modified files

| File | Change |
| --- | --- |
| `app/backend/src/core/env.ts` | Added typed AI env fields (keys stay in the main process) |
| `app/backend/src/bootstrap/AppBootstrapper.ts` | Builds the AI subsystem, registers DI tokens, swaps `NullCloudReasoner` for the orchestrated reasoner when AI is enabled |
| `app/backend/src/ipc/channels.ts` | Two new channels |
| `app/backend/src/ipc/registerIpc.ts` | Registers the optional AI handler group |
| `app/backend/src/preload.ts`, `preload.cjs` | Exposes `getAiStatus` / `listAiTools` |
| `app/frontend/src/ipc/ipcClient.ts`, `vite-env.d.ts` | Typed renderer access |
| `app/frontend/src/App.tsx` | New "AI PROVIDERS" HUD panel, refreshed every 10s |
| `.env.example` | Full AI configuration block |

## Not changed (by design)

Electron shell, React/Vite, the IPC transport, `BrainManager`, `RulesEngine`,
`TaskPlanner`, `ActionExecutor`, all agents, `MemoryManager`, SQLite storage,
`PermissionManager`, and the package manager (npm).
