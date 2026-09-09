# JARVIS OS — Roadmap From Current Baseline

## Stage 0 — Stabilization / Baseline Lock
**Status: this release**

- Keep M1-M4.0 protected.
- Wire Brain, agents, memory and permissions into the real Electron composition root.
- Verify IPC path and startup.
- Verify build/typecheck/test on the user's Windows machine.

## Stage 1 — Real Voice Runtime
**Next**

- Real microphone capture provider.
- Real STT provider with English + Swahili.
- Real TTS provider with preferred female voice.
- Real wake-word engine for "Jarvis".
- Connect all providers through the existing Audio Pipeline and Voice Runtime.
- Voice -> STT -> Brain -> Agent -> TTS end-to-end test.

## Stage 2 — Brain + Agent Production Hardening

- Expand intent coverage.
- Add richer multi-step planning.
- Add cancellation, timeouts and confirmation expiry.
- Add structured agent results and task progress events.
- Add persistent task history.
- Register agent health checks.
- Add safe application registry and user-configurable allowed applications.

## Stage 3 — Windows Automation

- Reliable process/application control.
- Window focus/minimize/maximize.
- Clipboard.
- Keyboard/mouse automation with explicit safety boundaries.
- System metrics dashboard.
- Startup/boot behavior.
- Safe shutdown/restart/lock flows.

## Stage 4 — Browser Automation

- Playwright/browser automation boundary.
- Tabs/windows.
- DOM inspection.
- Click/type/select/scroll.
- Search workflows.
- Login-sensitive operations with confirmation.
- Website allow/deny policy.

## Stage 5 — Coding Agent

- Project indexing.
- Read/understand repository context.
- Diagnostics and compiler/test feedback.
- Patch generation.
- Safe file edits with diff preview.
- Command execution with sandbox/allow-list.
- Git status/diff/commit assistance.
- Multi-file bug fixing with rollback.

## Stage 6 — Memory + Personalization

- Memory settings UI.
- View/edit/delete memory.
- Better conversation history controls.
- User preferences.
- Context retrieval optimized for low RAM.
- Optional semantic retrieval only if hardware budget permits.

## Stage 7 — Vision / Awareness

- Screen capture with explicit user control.
- Camera provider.
- OCR.
- Visual context extraction.
- Vision agent.
- Privacy indicator and camera permission controls.

## Stage 8 — Futuristic JARVIS HUD

- Central orb.
- Listening/speaking states.
- System health panels.
- Command center.
- Task queue.
- Agent activity feed.
- Voice-first interaction.

## Stage 9 — Plugin System

- Plugin manifest/capability model.
- Permission-scoped plugins.
- Lifecycle and health.
- Sandboxed plugin execution where practical.
- Plugin discovery and settings.

## Stage 10 — Production / Release

- Installer.
- Code signing.
- Auto-update.
- Crash reporting/log rotation.
- Performance profiling on i3 + 8 GB.
- Security review.
- Offline mode verification.
- Full end-to-end regression suite.
