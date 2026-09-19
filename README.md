# Cadence

A free, self-hostable guitar practice companion. Play a chord, see the fingering,
and progress at your own pace. MIT licensed.

**Alpha release.** Real-instrument recognition accuracy and mobile compatibility
are still being validated. This is not a production release.

Run the free personal workspace with one command, then open localhost:3000:

```sh
docker run --detach --name cadence --restart unless-stopped --publish 127.0.0.1:3000:3000 --volume cadence-data:/data ghcr.io/lojhan/cadence:0.1.0-alpha.3
```

Native AMD64 and ARM64 images are tested before publication. No external accounts
are required. [Release and package assets](https://github.com/Lojhan/cadence/releases/tag/v0.1.0-alpha.3).

The public application uses TanStack Start, pnpm, Rust/WASM, and Drizzle.
The private managed edition adds Clerk and Stripe; self-hosting requires neither.

## Development

Use Node 24.10+ (24.x), pnpm 10.32.1, Python 3.11+, and the pinned Rust toolchain.

```sh
pnpm install --frozen-lockfile
cargo install wasm-bindgen-cli --version 0.2.128 --locked
pnpm exec playwright install chromium
pnpm check
```

Run `pnpm dev` for UI development, or `pnpm dev:wasm` when editing Rust.
The latter watches Rust sources, Cargo manifests/lockfile and the toolchain file,
stops the dev server before each build, and restarts it after success. Keep only
one development command running on port 3000. Compilation failures leave the
server stopped until the next edit; Ctrl+C stops the watcher and its children.
A dev-server restart reloads connected pages, so microphone capture must be
started again. Unsaved in-memory edits can be lost during this development reload.

Poku is the test runner for all integration journeys, including browser and Rust
checks. Tests are written before behavior; CI must pass before milestone commits.

- [Product design](design/DESIGN.md)
- [Technical architecture](design/TECHNICAL_SPEC.md)
- [Reviewed HTML prototype](design/prototype.html)
- [Audio evaluation and remaining accuracy gates](docs/AUDIO_EVALUATION.md)
- [Implementation status](docs/IMPLEMENTATION.md)
- [Container, upgrades, and backups](docs/OPERATIONS.md)
