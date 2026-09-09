# JARVIS — Desktop AI Assistant

**Milestone 4.0 Alignment — Merge Complete.** The project now contains
M1 (Foundation) + M2 (Core Infrastructure) + M3.1 (Voice Provider
Architecture) + M3.2 (Speech-to-Text Architecture) + M3.3 (Wake Word
Architecture) + M3.4 (Audio Pipeline Architecture) + M4.0 (Voice Runtime
Framework) as **one coherent, verified codebase.** Still no AI Brain, no
intent detection, no command execution, and no real provider SDK,
model, or external API call anywhere.

> **How this came together:** M3.1, M3.2, and M3.3 did not exist in any
> prior deliverable — they were newly built in this pass, following the
> architecture spec provided. M1, M2, and M3.4 are preserved
> byte-for-byte from the prior Audio Pipeline milestone. M4.0's
> `VoiceRuntimeManager`/`VoiceRuntimeFactory`/events/sessions are
> preserved unmodified from the prior Voice Runtime milestone — the only
> change was in `AppBootstrapper.ts`, which now supplies real
> `WakeWordManager`/`SpeechManager`/`VoiceManager` instances into
> `VoiceRuntimeManager`'s pre-existing optional constructor parameters
> instead of omitting them. Full audit, PASS/FAIL table, and
> file-by-file changelog:
> [`docs/MILESTONE_4_INTEGRATION_REPORT.md`](docs/MILESTONE_4_INTEGRATION_REPORT.md) ·
> [`docs/MILESTONE_MERGE_CHANGELOG.md`](docs/MILESTONE_MERGE_CHANGELOG.md).

- [`docs/MILESTONE_1.md`](docs/MILESTONE_1.md) — Milestone 1 scope
- [`docs/ALIGNMENT_REPORT.md`](docs/ALIGNMENT_REPORT.md) — foundation alignment pass
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — main-process design rationale
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — naming conventions
- [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md) — Core Infrastructure reference (Milestone 2)
- [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) — Milestone 2 architecture / dependency / sequence diagrams
- [`docs/MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md`](docs/MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md) — Voice output / TTS architecture (Milestone 3.1)
- [`docs/MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md`](docs/MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md) — STT architecture, Swahili first-class (Milestone 3.2)
- [`docs/MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md`](docs/MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md) — Wake-word architecture, Secure Wake prep (Milestone 3.3)
- [`docs/AUDIO_PIPELINE_ARCHITECTURE.md`](docs/AUDIO_PIPELINE_ARCHITECTURE.md) — Audio Pipeline reference, diagrams, ADRs (Milestone 3.4)
- [`docs/AUDIO_ROUTING_GUIDE.md`](docs/AUDIO_ROUTING_GUIDE.md) — AudioRouter usage guide
- [`docs/AUDIO_SESSION_GUIDE.md`](docs/AUDIO_SESSION_GUIDE.md) — AudioSession field reference & privacy guarantees
- [`docs/AUDIO_ARCHITECTURE_REPORT.md`](docs/AUDIO_ARCHITECTURE_REPORT.md) — Milestone 3.4 compliance report
- [`docs/VOICE_RUNTIME.md`](docs/VOICE_RUNTIME.md) — Voice Runtime Framework reference, diagrams, ADRs (Milestone 4.0)
- [`docs/VOICE_RUNTIME_EVENTS.md`](docs/VOICE_RUNTIME_EVENTS.md) — runtime event catalog & sequence diagram
- [`docs/VOICE_SESSION_RUNTIME.md`](docs/VOICE_SESSION_RUNTIME.md) — VoiceSession lifecycle, timeout mechanics
- [`docs/VOICE_RUNTIME_ARCHITECTURE_REPORT.md`](docs/VOICE_RUNTIME_ARCHITECTURE_REPORT.md) — Milestone 4.0 compliance report
- [`docs/MILESTONE_4_INTEGRATION_REPORT.md`](docs/MILESTONE_4_INTEGRATION_REPORT.md) — merge audit, validation, PASS/FAIL table
- [`docs/MILESTONE_MERGE_CHANGELOG.md`](docs/MILESTONE_MERGE_CHANGELOG.md) — every file changed in this merge, file-by-file
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — what changed, milestone by milestone

## Stack

Electron · React · TypeScript · Vite · Node.js · SQLite (better-sqlite3)
· Zustand · TailwindCSS · Electron Builder · pnpm

## Quick start

```bash
pnpm install
pnpm bootstrap   # creates config/, database/, logs/, assets/, .env
pnpm dev         # Vite dev server + Electron together
```

## Development scripts

| Command                | Purpose                                                    |
|-------------------------|-------------------------------------------------------------|
| `pnpm bootstrap`        | Create runtime folders and `.env` from `.env.example`        |
| `pnpm dev`              | Bootstrap, then run frontend + backend dev servers together  |
| `pnpm dev:frontend`     | Run only the Vite dev server                                 |
| `pnpm dev:backend`      | Run only the Electron main process (`tsx watch`)              |
| `pnpm typecheck`        | `tsc --noEmit` for both frontend and backend                  |
| `pnpm lint` / `lint:fix`| ESLint across the whole project                              |
| `pnpm format`           | Prettier, writes in place                                     |
| `pnpm test`             | Vitest — all milestones' unit tests (160 total) |

## Build scripts

| Command             | Purpose                                                          |
|-----------------------|--------------------------------------------------------------------|
| `pnpm build`         | Type-check and build both frontend (`vite build`) and backend (`tsc`) |
| `pnpm build:frontend`| Build only the renderer to `app/frontend/dist`                     |
| `pnpm build:backend` | Compile only the main process to `app/backend/dist`                 |
| `pnpm package`       | Build, then run `electron-builder` to produce installers            |

## Folder structure

```
JARVIS/
├── app/
│   ├── frontend/       React + Vite renderer (UI shell only)
│   ├── backend/        Electron main process + Node backend
│   │   └── src/
│   │       ├── main.ts            entry point (minimal)
│   │       ├── bootstrap/         composition root + folder bootstrap
│   │       ├── lifecycle/         Electron app lifecycle events
│   │       ├── windows/           BrowserWindow creation
│   │       ├── ipc/               channels, router, registration, handlers
│   │       ├── config/            ConfigManager
│   │       ├── logging/           Logger + transports
│   │       ├── database/          DatabaseManager (SQLite)
│   │       ├── core/              constants, env loader, error hierarchy
│   │       ├── shared/            Shared Layer (types, interfaces, errors,
│   │       │                      constants, utilities, events, contracts,
│   │       │                      validation, base classes) — Milestone 2
│   │       ├── infrastructure/    Communication Bus, Capability Registry,
│   │       │                      Agent Manager, Event System, Health
│   │       │                      Monitor, DI Container — Milestone 2
│   │       ├── audio/             Audio Pipeline Architecture: AudioManager,
│   │       │                      AudioRouter, AudioFactory, pipeline stage
│   │       │                      interfaces — Milestone 3.4 (architecture only)
│   │       ├── voice-provider/    Voice Provider Architecture: VoiceManager
│   │       │                      (implements M4.0's IVoiceManager),
│   │       │                      VoiceProviderRegistry/Factory, VoiceProfile —
│   │       │                      Milestone 3.1 (architecture only, default
│   │       │                      voice: female/natural/calm/professional)
│   │       ├── speech-to-text/    Speech-to-Text Architecture: SpeechManager
│   │       │                      (implements M4.0's ISpeechManager),
│   │       │                      SpeechProviderRegistry/Factory, SpeechSession —
│   │       │                      Milestone 3.2 (architecture only, English +
│   │       │                      Swahili first-class)
│   │       ├── wake-word/         Wake Word Architecture: WakeWordManager
│   │       │                      (implements M4.0's IWakeWordManager),
│   │       │                      WakeWordProviderRegistry/Factory, WakeWordProfile —
│   │       │                      Milestone 3.3 (architecture only, default
│   │       │                      wake word: "Jarvis")
│   │       └── voice-runtime/     Voice Runtime Framework: VoiceRuntimeManager,
│   │                              VoiceRuntimeFactory, VoiceSession — Milestone 4.0
│   │                              (now connected to real WakeWordManager/
│   │                              SpeechManager/VoiceManager instances from
│   │                              M3.1/3.2/3.3, wired in AppBootstrapper)
│   ├── brain/          placeholder — future milestone (AI reasoning)
│   ├── agents/         placeholder — future milestone (concrete agents)
│   ├── communication/  placeholder — future milestone (agent-facing comms)
│   ├── voice/          placeholder — future milestone (STT/TTS)
│   ├── vision/         placeholder — future milestone
│   ├── memory/         placeholder — future milestone
│   ├── awareness/      placeholder — future milestone
│   ├── security/       placeholder — future milestone
│   └── plugins/        placeholder — future milestone
├── config/             runtime configuration (app.config.json)
├── database/           SQLite database file lives here at runtime
├── logs/                log files written here at runtime
├── assets/              icons and electron-builder resources
├── scripts/             bootstrap / dev / build scripts
├── tests/               Vitest — foundation, infrastructure/, and audio/
└── docs/                architecture, conventions, infrastructure, audio, diagrams, changelog
```

Every placeholder module (`brain`, `agents`, `communication`, `voice`,
`vision`, `memory`, `awareness`, `security`, `plugins`) still follows the
Milestone 1 standard: `README.md`, `index.ts`, `types.ts` — no
implementation, no business logic. `app/voice/` in particular is
completely unmodified by this milestone — the Audio Pipeline
Architecture lives under `app/backend/src/audio/`, the same placement
pattern Milestone 2 used for `infrastructure/`, so the placeholder
remains reserved for a future concrete voice-provider implementation.

## Architecture summary

Electron main process responsibilities are split one-per-file
(composition, lifecycle, window creation, IPC registration — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full table).
High-level modules depend only on interfaces (`ILogger`, `IConfigManager`,
`IDatabaseManager`, and now `ICommunicationBus`, `ICapabilityRegistry`,
`IAgentManager`, `IEventSystem`, `IHealthMonitor`, `IDIContainer`);
concrete implementations are injected at the composition root
(`AppBootstrapper`), which uses the new DI Container to wire the Core
Infrastructure singletons. Configuration flows one way — only
`ConfigManager` reads `config/app.config.json`; every other module
receives resolved values through its constructor, including Core
Infrastructure defaults (`AppConfig.infrastructure`). `IpcRouter` remains
transport only. See [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md)
for the full Core Infrastructure reference and
[`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) for diagrams. The Audio Pipeline
Architecture (`AudioManager`, `AudioRouter`, `AudioFactory`) follows the
same rules: registered into the same DI Container, config-driven via
`AppConfig.audio`, routed through the existing Event System rather than
a new transport — see
[`docs/AUDIO_PIPELINE_ARCHITECTURE.md`](docs/AUDIO_PIPELINE_ARCHITECTURE.md).
The Voice Runtime Framework (`VoiceRuntimeManager`, `VoiceRuntimeFactory`)
connects `AudioManager` plus the optional (currently unimplemented)
`IWakeWordManager`/`ISpeechManager`/`IVoiceManager` into one runtime,
also registered into the same DI Container and config-driven via
`AppConfig.voiceRuntime` — see
[`docs/VOICE_RUNTIME.md`](docs/VOICE_RUNTIME.md).

## Project conventions

See [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the full naming
convention (`Manager` / `Handler` / `Router` / `Bootstrap` / `Transport`
suffixes, `I`-prefixed interfaces, path alias rules, error `code`
conventions) — followed by every Core Infrastructure class.

## What Milestone 1 contains

Electron main process foundation, secure IPC bridge, React + Vite +
Tailwind + Zustand renderer, SQLite initialization, layered Configuration
Manager, pluggable Logging Manager, centralized error handling, folder
bootstrap, and full tooling (strict TypeScript, path aliases, ESLint,
Prettier, EditorConfig, `.gitignore`, `.env.example`, Vitest, electron-builder).

## What Milestone 2 contains

Communication Bus, Capability Registry, Agent Manager, Event System,
Health Monitor, DI Container, the Shared Layer, and eight reusable base
classes — see [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md). 38
automated tests, all passing.

## What Milestone 3.4 contains

The Audio Pipeline Architecture: `AudioManager` (session lifecycle,
device management, pipeline orchestration, buffer management, pipeline
health, statistics), `AudioRouter` (built on the existing Event System),
`AudioFactory`, `AudioSession`/`AudioDevice` models, interfaces for all
eight pipeline stages, a bounded/privacy-safe `AudioBufferQueue`, and a
`LatencyTracker` — see
[`docs/AUDIO_PIPELINE_ARCHITECTURE.md`](docs/AUDIO_PIPELINE_ARCHITECTURE.md).
42 automated tests, all passing.

## What Milestone 3.1 contains

The Voice Provider Architecture: `VoiceManager` (implements Milestone
4.0's `IVoiceManager`), `VoiceProviderRegistry`/`VoiceProviderFactory`,
`VoiceProfile` (default: female, natural/calm/professional/friendly/clear,
fully configurable). See
[`docs/MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md`](docs/MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md).
13 automated tests, all passing.

## What Milestone 3.2 contains

The Speech-to-Text Architecture: `SpeechManager` (implements Milestone
4.0's `ISpeechManager`), `SpeechProviderRegistry`/`SpeechProviderFactory`,
`SpeechSession`/`SpeechResult`/`SpeechChunk`. English and Swahili
(`sw-KE`) are both first-class languages from day one. See
[`docs/MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md`](docs/MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md).
9 automated tests, all passing.

## What Milestone 3.3 contains

The Wake Word Architecture: `WakeWordManager` (implements Milestone
4.0's `IWakeWordManager`), `WakeWordProviderRegistry`/`WakeWordProviderFactory`,
`WakeWordProfile` (default wake word: "Jarvis", configurable sensitivity/
confidence threshold/cooldown), and Secure Wake Mode contracts
(unimplemented — architecture prep only). See
[`docs/MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md`](docs/MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md).
13 automated tests, all passing.

## What Milestone 4.0 contains

The Voice Runtime Framework: `VoiceRuntimeManager` (initialize/start/
stop/pause/resume, session lifecycle, health monitoring, statistics,
error recovery), `VoiceRuntimeFactory`, `VoiceSession` model. Now
connected to real `WakeWordManager`/`SpeechManager`/`VoiceManager`
instances from Milestones 3.1–3.3 (wired in `AppBootstrapper.ts` — see
[`docs/MILESTONE_4_INTEGRATION_REPORT.md`](docs/MILESTONE_4_INTEGRATION_REPORT.md)).
Connects `AudioManager` (Milestone 3.4), the Communication Bus, Event
System, and Health Monitor (Milestone 2) into one lifecycle-managed
pipeline — see [`docs/VOICE_RUNTIME.md`](docs/VOICE_RUNTIME.md). 45
automated tests, all passing.

**160 automated tests total (`pnpm test`), all passing** across every
milestone.

## What this project intentionally does NOT contain

No AI, LLM, voice/STT/TTS, wake word, vision, memory persistence, learning,
concrete agents, plugins, browser/Windows automation, coding agent, database
business logic, or UI/dashboard beyond the Milestone 1 shell. The
Communication Bus, Capability Registry, and Agent Manager are transport,
catalog, and lifecycle infrastructure only. The Audio Pipeline
Architecture contains no microphone capture, no audio recording, no
Speech-to-Text, no Text-to-Speech, no wake-word engine, and no AI Brain —
every pipeline stage beyond the generic buffer queue is an interface a
future provider will implement. The Voice Provider, Speech-to-Text, and
Wake Word architectures each contain zero concrete provider
implementations — no TTS/STT/wake-word engine, no provider SDK, no
downloaded model, no external API call. The Voice Runtime Framework contains no
AI Brain, no intent detection, no command execution, and no Windows/
browser automation — `IWakeWordManager`/`ISpeechManager`/`IVoiceManager`
now have real implementations (`WakeWordManager`/`SpeechManager`/
`VoiceManager` from Milestones 3.3/3.2/3.1), but none of those
implementations contain a real detection model, transcription engine,
or speech synthesizer — every provider-level interface underneath them
(`IWakeWordProvider`/`ISpeechProvider`/`IVoiceProvider`) still has zero
concrete implementations anywhere in the project. Placeholder folders
remain reserved and must not gain implementation code until their own
explicitly scoped milestone begins.
