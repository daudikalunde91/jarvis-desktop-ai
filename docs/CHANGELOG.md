# Changelog

## Milestone 4.0 Alignment — Merge Complete (M3.1 + M3.2 + M3.3 built, merged with M4.0)

Scope: build the missing Voice Provider (M3.1), Speech-to-Text (M3.2),
and Wake Word (M3.3) architectures — confirmed absent from every prior
deliverable — and merge them with the existing Milestone 3.4 (Audio
Pipeline) and Milestone 4.0 (Voice Runtime Framework) into one unified,
verified codebase. Full detail in
`docs/MILESTONE_4_INTEGRATION_REPORT.md` (audit + PASS/FAIL table) and
`docs/MILESTONE_MERGE_CHANGELOG.md` (file-by-file).

**Summary:** M1, M2, and M3.4 preserved byte-for-byte. M4.0's
`VoiceRuntimeManager`/`VoiceRuntimeFactory`/events/sessions preserved
unmodified. M3.1/M3.2/M3.3 newly built, each providing a concrete
`VoiceManager`/`SpeechManager`/`WakeWordManager` that *implements* the
matching pre-existing M4.0 interface (`IVoiceManager`/`ISpeechManager`/
`IWakeWordManager`) — no duplicate interfaces, no duplicate managers.
The only integration-point change was in `AppBootstrapper.ts`, which now
supplies these three real instances into `VoiceRuntimeManager`'s
already-optional constructor dependencies instead of omitting them.

- **Added:** `app/backend/src/voice-provider/`, `speech-to-text/`,
  `wake-word/` (13 + 9 + 13 = 35 new tests)
- **Added docs:** `MILESTONE_3_1_VOICE_PROVIDER_ARCHITECTURE.md`,
  `MILESTONE_3_2_SPEECH_TO_TEXT_ARCHITECTURE.md`,
  `MILESTONE_3_3_WAKE_WORD_ARCHITECTURE.md`,
  `MILESTONE_4_INTEGRATION_REPORT.md`, `MILESTONE_MERGE_CHANGELOG.md`
- **Modified (additive only):** `config/{IConfigManager,default.config,ConfigManager}.ts`,
  `core/env.ts`, `.env.example`, `config/app.config.json` (three new
  config sections), `bootstrap/AppBootstrapper.ts` (new registration
  step + real manager instances supplied to `VoiceRuntimeManager`)
- **Untouched, verified byte-for-byte:** every M1/M2/M3.4 file,
  `DIContainer.ts`, `Logger.ts`, every M4.0 `voice-runtime/` file, all
  125 pre-existing tests

```
pnpm install     # clean install, no errors
pnpm typecheck   # frontend + backend, 0 errors
pnpm lint        # 0 errors, 0 warnings
pnpm test        # 160/160 passing (125 pre-existing, unmodified + 35 new)
pnpm build       # frontend (vite build) + backend (tsc), both succeed
```

Stopped here, as instructed. No AI Brain, intent recognition, or real
provider (TTS/STT/wake-word) was implemented; no prior milestone was
redesigned.

---

## Milestone 4 — Voice Runtime Framework

Scope: runtime orchestration only. No AI Brain, intent detection,
command execution, Windows/browser automation, vision, memory, or
coding agent. Milestones 1–3 were preserved exactly — no module was
renamed, moved, or redesigned; Dependency Injection, Logging, and
Configuration Manager mechanisms were not modified, only extended (new
registrations / new config keys), the same way Milestones 2 and 3
already extended them.

> **No project file was uploaded with this milestone's request at all.**
> Work continued directly from this session's in-progress workspace
> (Milestones 1–3). The instructions described Milestones 3.1–3.4 (Voice
> Provider / STT / Wake Word / Audio Pipeline architecture) as already
> locked; the actual project contains Milestone 3 (Audio Pipeline
> Architecture only, not subdivided) and no `WakeWordManager`/
> `SpeechManager`/`VoiceManager` implementation anywhere. See the note
> at the top of `docs/VOICE_RUNTIME.md`.

### Added

- **`app/backend/src/voice-runtime/`** — the entire Voice Runtime
  Framework, placed alongside `audio/` and `infrastructure/` following
  the same precedent (new subsystem code lives in `backend/src`; the
  matching placeholder, `app/voice/`, is left untouched):
  - `types/` — `VoiceRuntimeState`, `VoiceSessionState`, `VoiceSubsystemName`
  - `errors/` — `VoiceRuntimeError` hierarchy (extends Milestone 1's `AppError`)
  - `interfaces/` — `IWakeWordManager`, `ISpeechManager`, `IVoiceManager`
    (provider contracts, zero concrete implementations), `IVoiceSession`,
    `IVoiceRuntimeFactory`, `IVoiceRuntimeManager`
  - `models/` — concrete `VoiceSession`
  - `events/` — `VOICE_RUNTIME_EVENTS` catalog (7 required events +
    `STATE_CHANGED`), emitted through the *existing* Event System
  - `VoiceRuntimeManager.ts` — initialize/start/stop/pause/resume,
    session lifecycle with inactivity-based timeout, per-subsystem
    health registration, retry-with-backoff error recovery, a
    Communication Bus control channel (`voice-runtime.control`)
  - `VoiceRuntimeFactory.ts`, `tokens.ts`
- **Tests** (`tests/voice-runtime/*.test.ts`) — 45 new unit tests:
  initialization/lifecycle (13), event flow (5), error recovery (4),
  health (5), runtime shutdown (6), session lifecycle (10), Communication
  Bus control channel (3), VoiceRuntimeFactory (2). 125 total with
  Milestones 1–3's 80.
- **Docs** — `docs/VOICE_RUNTIME.md` (architecture, sequence pointer,
  dependency, and state diagrams, 3 ADRs), `docs/VOICE_RUNTIME_EVENTS.md`
  (event catalog + full sequence diagram), `docs/VOICE_SESSION_RUNTIME.md`
  (VoiceSession field reference, lifecycle, timeout mechanics,
  relationship to AudioSession), `docs/VOICE_RUNTIME_ARCHITECTURE_REPORT.md`.

### Changed

- `config/IConfigManager.ts`, `config/default.config.ts`,
  `config/ConfigManager.ts`, `core/env.ts`, `.env.example`,
  `config/app.config.json` — added a `voiceRuntime` config section
  (`defaultSessionTimeoutMs`, `maxRetryAttempts`, `retryBackoffBaseMs`),
  following the identical `defaults -> config file -> env var`
  precedence every other section already uses. `ConfigManager`'s
  precedence logic itself is unchanged.
- `bootstrap/AppBootstrapper.ts` — added a new wiring step (between Audio
  Pipeline registration and IPC registration) that registers
  `VoiceRuntimeFactory` and `VoiceRuntimeManager` as singletons into the
  **same** `DIContainer` instance from Milestones 2–3, resolving the
  existing `AudioManager`/`CommunicationBus`/`EventSystem`/`HealthMonitor`
  rather than creating new ones, and calls `voiceRuntimeManager.initialize()`
  during startup (not `start()` — the runtime is initialized but not
  actively listening until explicitly started). Added
  `getVoiceRuntimeManager()`/`getVoiceRuntimeFactory()` getters and
  disposes the runtime on `shutdown()`. No prior step was removed,
  reordered, or modified; `DIContainer.ts` itself was not touched.
- `README.md`, `docs/CONVENTIONS.md` (added the `Factory` suffix,
  retroactively documenting `AudioFactory` alongside the new
  `VoiceRuntimeFactory`), `docs/CHANGELOG.md` — updated for Milestone 4.

### Not changed

`DIContainer.ts`, `Logger.ts`/`ILogger.ts`/transports, `ConfigManager`'s
merge/precedence logic, every Milestone 2 infrastructure class, every
Milestone 3 audio class (`AudioManager`, `AudioRouter`, `AudioFactory`,
`AudioSession`, `AudioDevice`, `AudioBufferQueue`, `LatencyTracker`),
`app/frontend`, `WindowManager`, `IpcRouter`, all nine Milestone 1
placeholder modules (including `app/voice/`, left completely untouched),
and every file under `shared/`.

### Verification performed

```
pnpm install     # clean install, no errors
pnpm typecheck   # frontend + backend, 0 errors
pnpm lint        # 0 errors, 0 warnings
pnpm test        # 125/125 passing
pnpm build       # frontend (vite build) + backend (tsc), both succeed
```

Stopped here, as instructed. No AI Brain, intent detection, or command
execution was implemented; no prior milestone was redesigned.

---

## Milestone 3 — Audio Pipeline Architecture

Scope: architecture only for the audio pipeline. No microphone capture,
no audio recording, no Speech-to-Text, no Text-to-Speech, no wake-word
engine, no AI Brain, no UI, no hardware/provider SDKs. Milestones 1 and
2 were preserved exactly — no module was renamed, moved, or redesigned;
Dependency Injection, Logging, and Configuration Manager mechanisms were
not modified, only extended (new registrations / new config keys, the
same way Milestone 2 already extended them).

> The instructions for this milestone described Milestones 3.1–3.3
> (Voice Provider / STT / Wake Word architecture) as already locked. The
> uploaded project contained only Milestones 1 and 2 — `app/voice/` was
> still the unmodified Milestone 1 placeholder. This milestone was built
> directly on the verified Milestone 1 + 2 foundation; see the note at
> the top of `docs/AUDIO_PIPELINE_ARCHITECTURE.md`.

### Added

- **`app/backend/src/audio/`** — the entire Audio Pipeline Architecture,
  placed alongside `infrastructure/` following the same precedent
  Milestone 2 set (new subsystem code lives in `backend/src`, the
  matching placeholder folder — here, `app/voice/` — is left untouched):
  - `types/` — `AudioDeviceType`, `AudioConnectionType`,
    `AudioSessionStatus`, `AudioPipelineStageName`, `AudioFormat`
  - `errors/` — `AudioError` hierarchy (extends Milestone 1's `AppError`)
  - `interfaces/` — `IAudioChunk`, `IAudioDevice`, `IAudioSession`,
    `IAudioPipelineStage`, `IAudioRouter`, `IAudioManager`, `IAudioFactory`
  - `models/` — concrete `AudioSession`, `AudioDevice`
  - `buffer/` — `AudioBufferQueue` (bounded, in-memory-only FIFO)
  - `metrics/` — `LatencyTracker`
  - `pipeline/` — `AudioPipelineStageBase` + marker interfaces for all
    eight pipeline stages (microphone input, audio buffer, noise
    reduction, echo cancellation, wake-word routing, STT routing, voice
    output routing, speaker output)
  - `events/` — `AUDIO_EVENTS` catalog (session/device/stage lifecycle,
    emitted through the *existing* Event System)
  - `channels/` — `AUDIO_CHANNELS` catalog (the five required data
    routes, also carried by the existing Event System)
  - `AudioManager.ts`, `AudioRouter.ts`, `AudioFactory.ts`, `tokens.ts`
- **Tests** (`tests/audio/*.test.ts`) — 42 new unit tests: AudioSession
  (6), AudioFactory (3), AudioRouter (5), AudioManager (13), pipeline
  configuration (10), routing/event catalogs (5). 80 total with
  Milestones 1+2's 38.
- **Docs** — `docs/AUDIO_PIPELINE_ARCHITECTURE.md` (architecture,
  architecture/class/dependency/sequence diagrams, 3 ADRs),
  `docs/AUDIO_ROUTING_GUIDE.md`, `docs/AUDIO_SESSION_GUIDE.md`.

### Changed

- `config/IConfigManager.ts`, `config/default.config.ts`,
  `config/ConfigManager.ts`, `core/env.ts`, `.env.example`,
  `config/app.config.json` — added an `audio` config section
  (`sampleRateHz`, `channels`, `bitDepth`, `bufferCapacity`,
  `maxConcurrentSessions`, `defaultLanguage`, `noiseReductionEnabled`,
  `echoCancellationEnabled`), following the identical
  `defaults -> config file -> env var` precedence every other section
  already uses. `ConfigManager`'s precedence logic itself is unchanged —
  only the schema was extended, exactly as Milestone 2 did for its
  `infrastructure` section.
- `bootstrap/AppBootstrapper.ts` — added a new wiring step (between Core
  Infrastructure and IPC registration) that registers `AudioFactory`,
  `AudioRouter`, and `AudioManager` as singletons into the **same**
  `DIContainer` instance from Milestone 2, resolving the existing
  `EventSystem`/`HealthMonitor` rather than creating new ones. Added
  `getAudioManager()`/`getAudioRouter()`/`getAudioFactory()` getters and
  disposes `AudioManager` on `shutdown()` (clears any buffered audio).
  No Milestone 1 or 2 step was removed, reordered, or modified — this
  was inserted as a new step, and `DIContainer.ts` itself was not
  touched.
- `README.md`, `docs/CHANGELOG.md` — updated for Milestone 3.

### Not changed

`DIContainer.ts`, `Logger.ts`/`ILogger.ts`/transports, `ConfigManager`'s
merge/precedence logic, every Milestone 2 infrastructure class
(`CommunicationBus`, `CapabilityRegistry`, `AgentManager`, `EventSystem`,
`HealthMonitor`), `app/frontend`, `WindowManager`, `IpcRouter`, all nine
Milestone 1 placeholder modules (including `app/voice/`, left completely
untouched), and every file under `shared/` from Milestone 2.

### Verification performed

```
pnpm install     # clean install, no errors
pnpm typecheck   # frontend + backend, 0 errors
pnpm lint        # 0 errors, 0 warnings
pnpm test        # 80/80 passing
pnpm build       # frontend (vite build) + backend (tsc), both succeed
```

Stopped here, as instructed. No microphone capture, STT, TTS, wake-word
engine, or AI Brain was implemented; no prior milestone was redesigned.

---

## Milestone 2 — Core Infrastructure

Scope: enterprise-grade backbone infrastructure only. No AI, voice,
vision, memory, Windows/browser automation, coding agent, plugins, or
business logic. Nothing from Milestone 1 was redesigned — all changes
below are additive, plus a small number of composition-root wiring edits
required to actually make the new infrastructure usable.

### Added

- **Communication Bus** (`infrastructure/communication-bus/`) —
  `CommunicationBus`, `PriorityMessageQueue`. Pub/sub, command/response
  with correlation IDs, priority ordering, timeouts, exponential-backoff
  retry, and structural message validation.
- **Capability Registry** (`infrastructure/capability-registry/`) —
  `CapabilityRegistry`. Register/unregister/discover/query/status, with
  dependency-guarded unregistration.
- **Agent Manager** (`infrastructure/agent-manager/`) — `AgentManager`.
  Load/unload/enable/disable/restart, dependency validation, Health
  Monitor integration. No concrete agents.
- **Event System** (`infrastructure/event-system/`) — `EventSystem`.
  Categorized (system/application/plugin/agent/user/internal),
  prioritized, supports delayed emission.
- **Health Monitor** (`infrastructure/health-monitor/`) — `HealthMonitor`.
  Interval polling, on-demand checks, heartbeat, consecutive-failure
  tracking, restart-callback trigger.
- **DI Container** (`infrastructure/di-container/`) — `DIContainer` +
  `ScopedDIContainer`. Singleton/transient/scoped lifetimes, lazy
  factories, circular-dependency detection.
- **Shared Layer** (`shared/`) — `types/`, `interfaces/`, `errors/`,
  `constants/`, `utilities/`, `events/`, `contracts/`, `validation/`,
  `base/`. Single source of truth for cross-cutting contracts.
- **Base Classes** (`shared/base/`) — `BaseService`, `BaseManager`,
  `BaseRepository`, `BaseEvent`, `BaseCommand`, `BaseResponse`,
  `BaseAgent`, `BasePlugin`.
- **Tests** (`tests/infrastructure/*.test.ts`) — 35 new unit tests across
  all six infrastructure modules (38 total with Milestone 1's smoke
  tests).
- **Docs** — `docs/INFRASTRUCTURE.md`, `docs/DIAGRAMS.md` (architecture,
  dependency, and sequence diagrams), this changelog.

### Changed

- `config/IConfigManager.ts`, `config/default.config.ts`,
  `config/ConfigManager.ts`, `core/env.ts`, `.env.example`,
  `config/app.config.json` — added an `infrastructure` config section
  (`commandTimeoutMs`, `maxRetryAttempts`, `retryBackoffBaseMs`,
  `healthPollIntervalMs`, `maxConsecutiveFailures`) so Communication Bus
  and Health Monitor defaults flow through the Configuration Manager
  instead of being hardcoded, following the same
  `defaults -> config file -> env var` precedence as every other setting.
- `bootstrap/AppBootstrapper.ts` — added a new wiring step (between
  database connection and IPC registration) that constructs a
  `DIContainer` and registers `CommunicationBus`, `EventSystem`,
  `CapabilityRegistry`, `HealthMonitor`, and `AgentManager` as
  singletons; starts Health Monitor polling; stops it on `shutdown()`.
  Added read-only getters (`getContainer`, `getCommunicationBus`, etc.)
  for tests and future modules. No Milestone 1 step was removed or
  reordered — this was inserted as a new step.
- `README.md` — added a Core Infrastructure section; updated the folder
  tree and "what this contains" lists.

### Not changed

`app/frontend` (React shell, Zustand store, styling), `WindowManager`,
`IpcRouter`/`channels.ts`/`registerIpc.ts`, `DatabaseManager`, `Logger`
and its transports, `FolderBootstrap`, `AppLifecycle`, and every
placeholder module (`brain`, `voice`, `vision`, `memory`, `awareness`,
`security`, `plugins`, and the `agents`/`communication` placeholder
*content* — their `README.md`/`index.ts`/`types.ts` are untouched; the
new `agent-manager` and `communication-bus` infrastructure lives under
`app/backend/src/infrastructure/`, not inside those placeholder folders,
so those folders remain reserved exactly as Milestone 1 left them).

### Verification performed

```
pnpm install     # clean install, no errors
pnpm typecheck   # frontend + backend, 0 errors
pnpm lint        # 0 errors, 0 warnings
pnpm test        # 38/38 passing
pnpm build       # frontend (vite build) + backend (tsc), both succeed
```

Stopping here, as instructed. Voice System and Milestone 3 have not been
started; no architectural redesign was performed.

---

## Milestone 1 — Project Foundation

See `docs/MILESTONE_1.md` and `docs/ALIGNMENT_REPORT.md` for the
foundation scope and the subsequent alignment pass.
