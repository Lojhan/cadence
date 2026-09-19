Cadence's MIT public core is available for integration and self-hosting evaluation.
The application includes the reviewed practice UI, local Rust/WASM recognition,
portable song imports, SQLite/PostgreSQL persistence, and container backup tools.

This is an **alpha**. Synthetic audio and browser integration tests pass; real
instrument recognition accuracy, latency, and mobile device compatibility have
not yet met the release gates. The private hosted edition is under development.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. Package manifests pin companion
packages to this same release. Container images are tested on native AMD64 and
ARM64 runners before their shared manifest is published.

See `docs/OPERATIONS.md` for container configuration, migrations, and backups.
