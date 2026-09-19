# Implementation ledger

The complete deliverable is the reviewed design and technical specification,
public `Lojhan/cadence`, private `Lojhan/cadence-cloud`, verified containers,
local Rust/WASM recognition, Drizzle persistence, and hosted identity/billing.
A green partial milestone does not mean the product is complete.

## Scope / evidence

- [x] Preserve reviewed design; remove POC source/build/dependencies.
- [x] pnpm, MIT, Poku, Biome, strict TypeScript, baseline CI.
- [x] Public/private GitHub repositories and verified CI.
- [ ] Contracts, music import/export, curated voicings and default music.
- [ ] Pure practice core: epochs, repeat/rearm, completion, timeline.
- [ ] Rust DSP/recognition, WASM package and real-recording evaluation.
- [ ] Browser capture/worklet/worker and recovery lifecycle.
- [ ] Application authorization and Drizzle SQLite/Postgres parity/migrations.
- [ ] TanStack Start routes/server functions and reviewed UI/features.
- [ ] Container run, persistence, backup/restore, multi-arch images.
- [ ] Private Clerk identity, Stripe lifecycle/entitlements, cloud DB/UI.
- [ ] End-to-end Poku browser tests, audio corpus gates, deployed smoke tests.
- [ ] Full requirement-by-requirement completion audit.

## Test-first record

Foundation: Poku workspace test failed on missing workspace configuration before
implementation; the same test must pass with Biome and strict type checking before
committing. Future milestones append actual red/green evidence here.

The user's Poku requirement supersedes the spec's earlier Vitest proposal. Rust's
native assertions remain in Rust, invoked and checked by Poku. Browser automation
uses Playwright as a driver inside Poku, not as a separate test runner.

Music/core milestone: tests first failed on missing packages, then caught an omitted fifth in the open C7 voicing and a lyric-line false positive. Full-tone barre C7 is supported; omitted-tone voicings are intentionally excluded until their recognition contract is explicit. All 12 chromatic roots across major/minor/seventh/m7/maj7 are checked against sounding string pitches. Core tests cover stale epochs, duplicate matches, armed acknowledgment, paused input, completion, and a bounded loop timeline.

Rust/WASM milestone: native tests first failed on missing engine exports; WASM tests first failed on missing generated artifacts. A continuous-audio regression then exposed reuse of pre-arm FFT evidence; arming now clears the spectral window while retaining attack/release history. Native recognition covers two sample rates, common chords, confusable chords, noise, silence, invalid/clipped samples, reset, and repeat rearm. Poku verifies the actual WASM artifact and no memory growth during processing. These are synthetic engineering checks, not real-instrument release evidence. Biome, package boundary checks, TypeScript, Rust fmt/clippy and all Poku suites pass locally.

Browser transport milestone: the frame-order test failed before the protocol existed. Poku now checks stale generations/epochs, duplicate/gapped frames, bounded worklet buffers, channel downmixing, immediate mute, and cleanup when microphone permission resolves after disposal. Worker owns WASM; capture sends PCM directly over a MessageChannel. Real browser/device and final built-asset verification remain pending with app integration. Buffer discontinuities pause recognition instead of counting partial evidence.

Storage milestone: repository/application tests first failed on missing adapters, then exposed SQLite write-return behavior and inconsistent synchronous input errors. The same Poku contract now passes on real SQLite and PostgreSQL 17.6: owner isolation, catalog protection/idempotency, optimistic conflicts, rollback, preferences, positions, and export/import. Drizzle SQL and metadata are committed separately per dialect. Empty databases initialize automatically; existing schemas require an explicit migration when their recorded hash differs. CI runs both adapters.

Public app milestone: TanStack Start now composes the shared React UI/features and server functions. Production browser tests initially failed because native SQLite dependencies and migrations were missing from the output; both are now packaged. Tests then exposed an SVG title hydration mismatch, fixed by rendering one text node. Poku verifies the built phone UI, source→worklet→worker→WASM recognition with a synthetic MediaStream, theme/handedness changes, manual bounds, unwrapped timeline, idle fretboard visibility, song import and last-song restoration. Chromium's native fake-device getUserMedia call remained pending in this macOS environment; `CADENCE_NATIVE_MIC=1` retains that separate path, and real-device permission/accuracy validation remains outstanding. Original chart text and imported-song progress now round-trip through the portable archive. The full check and both database adapters pass locally.

Operations milestone: the container suite first failed on the missing image. It now writes a theme preference through the actual browser UI, restarts the non-root container, and verifies identical stored preferences, bundled backup creation, Host rejection, and the image healthcheck on a non-default external port. Node fetch ignores a custom Host header, so both the health probe and hostile-Host test use node:http. The compiled admin backup/restore suite first failed on missing commands, then passed round-trip data and overwrite refusal. Full public checks (14 suites), PostgreSQL parity, and the native ARM64 container pass locally. CI now runs container validation on native AMD64 and ARM64 runners; image publication remains pending those checks.

Distribution milestone: the package test failed on absent distribution manifests before implementation. The release builder now emits ESM and declarations, includes MIT licenses/WASM/worklet/migrations, pins companion tarball URLs to the same release, and records SHA-256 checksums. A separate temporary consumer installs the actual nine tarballs, exercises music/application/SQLite/WASM, and typechecks UI/features with library checking enabled. All 16 Poku suites and full checks pass locally. The alpha release workflow gates native AMD64/ARM64 image publication and package assets on those checks; no stable accuracy claim is made.

Alpha publication: GitHub Actions passed the full checks and native AMD64/ARM64 container suites, then published v0.1.0-alpha.1 package assets and the GHCR multi-architecture image. An unauthenticated pull and the entire installed-container Poku suite passed against that published image locally. The private repo consumes the immutable-version release URLs. Real recognition and hosted deployment gates remain open.

Request-size regression: a production HTTP test sent a 12 MB chunked body without Content-Length and initially received 200. The public server now reads a bounded clone before framework deserialization, returns 413 for oversized bodies, and preserves accepted request input. Unit and built-server Poku tests pass alongside the full check.

Sound-check lifecycle regression: the browser test first timed out after changing the recognition profile because the previous sound check kept running. Setup changes now remount the sound check, dispose the old capture, and require a fresh start. Error paths also dispose capture, and asynchronous startup cannot mark an unmounted check as listening. The built-browser test verifies the old media tracks end; all 19 suites and full checks pass locally.

Recording evaluation milestone: added an offline Rust WAV evaluator and checksum-verified GuitarSet preparation, keeping calibration and held-out players separate. Native/WASM fixtures first failed on a missed real C chord, then exposed F/Fm and Em/E confusion while tuning. Harmonic suppression and pitch-class dominance fix those regressions. A separate red/green selection test prevents a later played chord change from being scored against an earlier annotation. On the complete calibration strum subset, accepted positives rise from 134/233 to 209/233 with all previous successes preserved, and both engines reject 203/203 wrong-quality targets. Matching p95 is 511 ms of recorded audio, not device latency. Held-out players remain unexamined; the 95% target is unmet. See AUDIO_EVALUATION.md for exact scope and the comparison artifact.

Continuous-transition regression: a native test first showed that C→G at similar volume could remain blocked waiting for silence. Attack/release gating now applies to rearming an identical confirmed chord, while changing the target clears old spectral evidence and evaluates the new chord. The browser journey exercises two consecutive matches through capture, worklet, worker and WASM, with no silent gap.
