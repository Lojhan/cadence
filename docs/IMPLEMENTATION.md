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

Portability completion: the new archive contract test first failed because full exports still used version 1 and omitted default-repertoire progress. Full exports now use version 2 with catalog sequence references; version 1 imports remain supported. Import restores only matching catalog sequences, respects destination revisions, leaves changed/missing catalog progress alone, and never uses catalog references to overwrite personal-song progress. Duplicate/invalid entries roll back the whole import. The same contract passes on SQLite and PostgreSQL; full checks pass with 21 Poku suites. PORTABILITY.md documents the version and compatibility policy.

First-use setup: the browser test first failed because the microphone button immediately started capture. A first press now opens a compact hand/input/sound-check dialog; only Check microphone requests permission. Successful setup is remembered in browser-local storage, separately from synced preferences and archives. Finishing or closing releases capture; reopening the app remains paused. Device choices refresh after permission, and changing the input stops the old check and requires a fresh signal. The input-refresh test first failed on the absent option, then passed after the callback was connected (the simulated MediaDeviceInfo uses a method rather than an arrow property to avoid a serialized test-helper dependency). The production browser journey verifies setup, cleanup, persistence and subsequent practice. Browser verification found no console errors or horizontal overflow; dark 390×844 and light 360×640 screenshots were inspected, with internal dialog scrolling on the smaller screen.

Expanded recognition validation: Poku tests first failed on the missing related-chord generator, missing performed→target matrix, and ignored profile argument. The evaluator now supports all three real engine profiles and explicit confusion reports; negative generation includes added/removed sevenths and related roots with fixed, annotation-verified windows. Balanced accepts 27/1,313 wrong targets, revealing failures hidden by the earlier major/minor-only set. Gentle/Precise tradeoffs are measured separately. Runtime experiments that introduced regressions were reverted. Held-out data remains untouched, and no profile meets every release target; AUDIO_EVALUATION.md records the expanded evidence without changing the earlier experiment's scope.


WASM corpus parity: the Poku test first failed on the missing evaluator. The new offline runner uses the actual generated WASM engine and a development-only WAV decoder. PCM formats and channel averaging have separate Poku coverage. All 1,546 calibration cases across three profiles agree exactly with optimized native Rust in match decision and sample-based latency (4,638 comparisons). The default suite uses checked-in fixtures; an environment variable enables the full local corpus. This does not change the classifier or satisfy the outstanding accuracy/device gates.


Progress save recovery: queue tests first failed on the missing implementation; the production-browser test then reproduced the missing Retry control in the previous build. Pending writes now retain the latest position per song, serialize revision updates, and coalesce intermediate changes during an active write or failure. A failed request leaves a persistent Retry notice while practice remains usable. Song selection waits for successful persistence, avoiding replacement of unsaved progress. The browser test disconnects, advances twice, reconnects, retries and reloads to verify the latest position and paused microphone. Pending changes are held in memory, so the notice asks the user to keep the page open; cross-tab revision conflict resolution and preference retry remain separate work.

Browser fixture follow-up: repeated verification exposed intermittent misses in the existing C→G test before reaching save recovery. The simulated microphone now retains its source AudioContexts and closes them when tracks stop; it also waits for the requested profile save before starting practice. Worker diagnostics retain non-metric events. With those fixture lifecycle changes, the complete offline/retry/library/reload journey passes without changing recognition assertions or the DSP.


Preference recovery: the new browser test first failed because offline theme changes did not apply and had no retry action. Settings now use an optimistic draft across all preference consumers, including microphone profile selection, while retaining the revision on which the draft was based. Failed writes keep the draft; Retry is available in the panel and on the practice screen. Background preference refetches are disabled while a draft exists, and an in-flight read is cancelled when editing starts. Mutations attempt once even offline instead of remaining paused, following TanStack Query's explicit network-mode contract (https://tanstack.com/query/latest/docs/framework/react/guides/network-mode). Controls remain available again after failure, so a subsequent edit preserves earlier unsaved changes. Archive restore requires saving pending settings first.

A second browser tab verifies that stale revisions cannot overwrite newer saved preferences. “Use saved settings” explicitly discards the draft and loads the server values. Poku covers immediate offline theme application, multiple retained edits, retry from the practice screen, persistence after reload, rejected cross-tab writes, and recovery to the other tab's values. All 25 suites and the full build/lint/type/boundary/Rust checks pass. Pending changes still require keeping the page open; durable offline storage and progress-conflict recovery are not implied by this change.


Continuous-label evaluation correction: Poku first demonstrated that a strum label incorrectly lasted 1.5 seconds after its required third ended at 0.65 seconds. The selector now stops at the first loss of any required pitch class after the attack, allowing overlapping notes/octaves but not bridging release gaps. Foreign-onset and minimum-duration rules remain in force. The corrected calibration subset has 116 positives and 656 related negatives; Balanced accepts 97 positives and 10 wrong targets. This is a stricter measurement of the unchanged engine, not an accuracy improvement. The new report retains all 233 prior-positive interval dispositions and all profile failures, alongside the historical reports. Full current-corpus Poku parity passes for 2,316 native/WASM decisions and latencies. Held-out recognition remains unexamined.


Coordinated release metadata: preparing alpha.2 exposed a missing requirement in the original package release. Poku first failed on absent RELEASE.json. The release builder now records the Git source revision and dirty-worktree status, all nine package versions/checksums, the actual WASM hash with engine/protocol versions, a content-addressed default catalog version, and both dialects' required migration names/hashes. SHA256SUMS also covers the manifest. Tests compare the metadata with the shipped files and migration journals. The initial alpha.2 workflow was cancelled before publication so the release can include this verified manifest. Full local checks pass with 25 Poku suites.


Declared dependency enforcement: a Poku regression first showed that an undeclared external import passed the boundary checker. The scanner now validates imports, re-exports, and static module loads against each package's dependencies/peers/optional dependencies; development dependencies are available only outside its shipped src tree. It also recognizes bare Node builtins and rejects React imports in framework-independent packages. Existing package sources pass these stricter checks. This CI/tooling change does not alter the alpha.2 runtime being published from 38bc14e.


Alpha.2 publication: release workflow 35459939248 passed full checks, PostgreSQL parity, and native AMD64/ARM64 container tests for source commit 38bc14e. It published nine package assets, RELEASE.json and SHA256SUMS at v0.1.0-alpha.2, plus ghcr.io/lojhan/cadence:0.1.0-alpha.2. Downloaded assets match the CI artifact's checksums and clean source revision; an anonymous image pull and the installed-container Poku suite passed locally. README, operations and Compose now point to this published alpha. Recognition remains experimental; real providers and deployed hosted smoke tests are still outstanding.
