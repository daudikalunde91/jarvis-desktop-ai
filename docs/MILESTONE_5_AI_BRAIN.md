# Milestone 5 — Real AI Brain (M5.1)

JARVIS remains the orchestrator. OpenAI, Gemini, Claude and any local engine
are **providers of reasoning only** — they never touch the operating system.

## Architecture

```
User
 ↓
IPC (existing bridge, unchanged)
 ↓
BrainManager  (M5 baseline, unchanged)
 ├── RulesEngine        → deterministic commands (no AI call)
 ├── TaskPlanner        → plan
 ├── ActionExecutor     → permission-gated agents
 ├── MemoryManager      → recall
 └── ICloudReasoner  ── OrchestratedCloudReasoner (new adapter)
                          ↓
                      AIOrchestrator
                        ├── ProviderRegistry
                        ├── ProviderRouter        (task type + capability + config priority)
                        ├── ProviderHealthManager (cooldowns per error category)
                        ├── FallbackManager       (walks the routed list)
                        ├── ContextManager        (bounded history)
                        └── UsageTracker          (latency, tokens, fallbacks)
                          ↓
                OpenAIProvider · GeminiProvider · ClaudeProvider · LocalProvider
```

The existing extension point (`ICloudReasoner`) was reused deliberately: no
existing M1–M4 class was rewritten, deleted, or replaced.

## Local-first policy

`BrainManager` already resolves in this order and that order is preserved:

1. Rules Engine (offline, instant, private)
2. Task Planner + Action Executor (permission-gated agents)
3. AI orchestrator — **only** for utterances no rule matched

So "Saa ngapi?", "System info", "Open VS Code", memory recall and every other
deterministic command still complete with zero API calls.

## Provider selection

Priorities are configuration, not code (see `.env.example`):

| Task type      | Default order                       |
| -------------- | ----------------------------------- |
| general        | openai → gemini → claude → local    |
| coding         | claude → openai → gemini → local    |
| multimodal     | gemini → openai → claude → local    |
| summarization  | gemini → openai → claude → local    |
| planning       | openai → claude → gemini → local    |

A provider is skipped when it is disabled, unconfigured, lacks a required
capability (vision / tool calling), or is inside a health cooldown.

## Failover and normalized errors

Adapter failures become `ProviderError` subclasses: `AuthenticationError`,
`RateLimitError`, `QuotaExceededError`, `TimeoutError`, `NetworkError`,
`ModelUnavailableError`, `InvalidRequestError`. Each category has a cooldown
(e.g. rate limit 1 min, quota 30 min, auth 15 min). When every provider fails,
`NoProviderAvailableError` is raised and JARVIS says plainly that cloud
reasoning is unavailable — it never fabricates an "AI" answer.

## Tool calling

Models may only *request* a named tool. `ToolExecutor` checks the existing
`PermissionManager` policy (or the tool's own risk level), demands explicit
confirmation for medium/high/sensitive risk, and then runs it. Built-in tools:
`system.get_time`, `system.get_info`, `files.list`, `files.exists`,
`files.read`.

## Security

- API keys are read only in the Electron main process (`core/env.ts`).
- No key, base URL or prompt crosses the IPC bridge.
- Logs record provider id, model, latency, error category — never secrets.
- The renderer receives only the secret-free health summary.

## IPC additions

| Channel            | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `system:ai-status` | Secret-free provider health summary       |
| `system:ai-tools`  | Tool names, descriptions and risk levels  |

Existing channels are untouched; no second communication system was added.

## Tests

`tests/ai/` covers: local command uses no AI, OpenAI success, rate-limit
fallback to Gemini, quota fallback to Claude, coding routing, all-providers-
down behaviour, invalid API key, disabled provider, AI disabled entirely,
keys absent from status output, tool permission/confirmation, unknown tool
rejection, and context trimming. Full suite: 185 tests passing.
