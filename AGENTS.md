# AGENTS.md — Cadence Engineering Guidelines & Invariants

You are an expert engineer working on Cadence. This document defines the architectural rules, coding standards, and verification procedures for this codebase.

---

## 1. Dual-Repository System

1. **`cadence` (Public, MIT)**:
   - Self-hostable, offline-first personal guitar practice web application.
   - Contains: Rust audio crates (`cadence-dsp`, `cadence-recognition`, `cadence-wasm`, `cadence-eval`), public TypeScript packages (`@cadence/*`), public web app (`apps/web`), and Docker packaging.
   - **Rule**: Never import, reference, or commit proprietary provider SDKs (Clerk, Stripe), billing tables, or hosted entitlement checks to this repo.
2. **`cadence-cloud` (Private, Commercial)**:
   - Managed hosted distribution deployed to Vercel + Neon PostgreSQL.
   - Contains: Clerk identity (`packages/identity-clerk`), Stripe billing (`packages/billing`), hosted database (`packages/cloud-db`), custom auth/account UI (`packages/cloud-ui`), and hosted web app (`apps/cloud`).
   - **Rule**: Consumes published, versioned release tarballs of `@cadence/*` from GitHub releases. Does NOT maintain divergent copies of public core packages.

---

## 2. Core Architectural Invariants

### Audio & Recognition
- **Rust owns recognition; TypeScript owns browser orchestration.**
  - Rust/WASM performs windowing, spectral analysis, multi-pitch estimation, and chord scoring.
  - TypeScript manages `AudioContext`, `AudioWorklet`, Web Worker lifecycle, and UI state.
- **Zero JavaScript Fallback**:
  - Never implement a fallback chord matcher, spectral analyzer, pitch estimator, or confidence timer in JavaScript.
  - Synthetic tests and live microphone capture must exercise the exact same Rust engine.
- **Deterministic Match Contract**:
  - Match accumulation runs on processed contiguous sample time, never React render frames or `Date.now()`.
  - A chord match immediately disarms the target until a new target is explicitly armed.
  - Re-strumming the same chord requires an onset/reattack; changing targets retains attack history.

### Layered TypeScript Boundaries
Follow strict package layering. No package may import across forbidden boundaries:
- `@cadence/contracts`: Types and Zod schemas only. No React, Node, DB, or audio APIs.
- `@cadence/music`: Pitch theory, chord voicings, chart parser. No audio DSP or UI.
- `@cadence/core`: Pure practice state machine. No React, DOM, or WASM dependencies.
- `@cadence/audio-engine`: ABI wrapper around generated WASM module.
- `@cadence/audio-browser`: Browser capture, AudioWorklet, Worker lifecycle, device discovery.
- `@cadence/ui`: Pure presentational React components, CSS tokens, SVG fretboard. No data fetching or audio capture.
- `@cadence/features`: Composed React hooks and practice flows.
- `@cadence/application`: Business logic and repository interfaces (ports).
- `@cadence/db`: Drizzle SQLite and PostgreSQL adapters (adapters). Never imported directly by `@cadence/application`.

---

## 3. Rules of Engagement for AI Agents

1. **Test-First Development (TDD)**:
   - Always reproduce bugs or define new features with a failing test before editing implementation code.
   - Tests must check meaningful behavior. Never add tests that merely assert source filenames, imports, CSS class names, or other implementation structure.
   - Test runner is **Poku** (`pnpm test` / `pnpm check`).
2. **Empirical Honesty & Zero Hallucinations**:
   - Never claim recognition accuracy improvements, latency benchmarks, or device compatibility without real corpus evaluation data or physical device logs.
   - If an experiment fails or regresses accuracy, revert the candidate code and document the rejection (see `docs/AUDIO_EVALUATION.md`).
3. **Environment & Node Toolchain**:
   - Always execute scripts and tests with Node 24 (see `.nvmrc`).
4. **Credential & Secret Hygiene**:
   - Never commit API keys, webhook secrets, or test tokens.
   - Test keys exist only inside child processes or ignored local environment files.
   - Production database connections must always use TLS and never be connected to test suites.
5. **Code Quality Commands**:
   Before submitting or committing changes, all of the following must pass:
   ```sh
   pnpm biome check --write
   pnpm typecheck
   pnpm test
   ```
   If editing Rust crates:
   ```sh
   cargo fmt --check
   cargo clippy --all-targets -- -D warnings
   cargo test
   ```

---

## 4. Key Workflows

- **UI Development**: `pnpm dev` (port 3000).
- **Rust/WASM Development**: `pnpm dev:wasm` (recompiles WASM and restarts the dev server).
- **Corpus Evaluation**:
  ```sh
  cargo run --release -p cadence-eval -- run \
    --corpus docs/evaluation/guitarset-inventory.json \
    --report-summary
  ```
- **Cloud Provider Testing (Local Sandbox)**:
  ```sh
  CADENCE_TEST_DATABASE_URL=postgres://... pnpm test
  CADENCE_TEST_ORIGIN=https://... pnpm test:providers
  ```
