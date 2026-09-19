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
