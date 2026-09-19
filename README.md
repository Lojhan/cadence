# Cadence

A free, self-hostable guitar practice companion. Play a chord, see the fingering,
and progress at your own pace. MIT licensed.

**Under active construction.** The original POC has been discarded. No production
release or validated recognition accuracy is claimed yet.

The public application uses TanStack Start, pnpm, Rust/WASM, and Drizzle.
The private managed edition adds Clerk and Stripe; self-hosting requires neither.

## Development

Use Node 24.10+ (24.x), pnpm 10.32.1, and the pinned Rust toolchain.

```sh
pnpm install --frozen-lockfile
cargo install wasm-bindgen-cli --version 0.2.128 --locked
pnpm exec playwright install chromium
pnpm check
```

Poku is the test runner for all integration journeys, including browser and Rust
checks. Tests are written before behavior; CI must pass before milestone commits.

- [Product design](design/DESIGN.md)
- [Technical architecture](design/TECHNICAL_SPEC.md)
- [Reviewed HTML prototype](design/prototype.html)
- [Implementation status](docs/IMPLEMENTATION.md)
- [Container, upgrades, and backups](docs/OPERATIONS.md)
