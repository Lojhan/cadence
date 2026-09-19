Cadence 0.1.0-alpha.3 is an MIT-licensed preview for self-hosting and integration.
It includes the reviewed practice UI, local Rust/WASM recognition,
SQLite/PostgreSQL persistence, and container backup tools.

Changes since alpha.2:

- Explicit recovery from conflicting progress saves, including loading another tab's saved position.
- Save notices stay clear of the chord, fretboard and timeline on small phones.
- Microphone retry reopens an ended stream; unavailable saved inputs remain visible and disabled.
- Clear permission, disconnected-device and busy-device errors with retry coverage.
- Stronger package dependency checks, an explicit database-generation command and Rust development watch mode.

Recognition remains **experimental**. No profile meets every release target.
On the corrected calibration subset, Balanced recognizes 97/116 qualifying strums
and incorrectly accepts 10/656 related targets. These are calibration comparisons,
not held-out accuracy or end-to-end device latency. Physical microphone and mobile
validation and authenticated hosted-provider journeys remain outstanding. The hosted
anonymous sign-in smoke passes; billing configuration is still incomplete.
See [audio evaluation](https://github.com/Lojhan/cadence/blob/main/docs/AUDIO_EVALUATION.md)
for scope, historical measurements, and limitations.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the source
commit, package hashes/versions, WASM hash and protocol, content-addressed catalog
version, and required migration hashes for both databases. Companion dependencies are pinned
to this release. Container images are tested on native AMD64 and ARM64 runners
before their shared manifest is published.

No database schema migrations were added since alpha.2. Back up before upgrading.
Alpha.1 cannot import full version 2 archives; individual-song exports remain
version 1. See [portability](https://github.com/Lojhan/cadence/blob/main/docs/PORTABILITY.md)
and [operations](https://github.com/Lojhan/cadence/blob/main/docs/OPERATIONS.md).
