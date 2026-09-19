Cadence 0.1.0-alpha.2 is an MIT-licensed preview for self-hosting and integration.
It includes the reviewed practice UI, local Rust/WASM recognition,
SQLite/PostgreSQL persistence, and container backup tools.

Changes since alpha.1:

- First-use microphone setup, input selection, and sound-check cleanup.
- Progress and settings save recovery, including explicit retry and settings conflict recovery.
- Full exports now preserve default-song progress using archive version 2; version 1 imports remain supported.
- Bounded chunked HTTP request bodies and continuous C→G recognition without requiring silence.
- Expanded real-recording evaluation and native/WASM parity checks.

Recognition remains **experimental**. No profile meets every release target.
On the corrected calibration subset, Balanced recognizes 97/116 qualifying strums
and incorrectly accepts 10/656 related targets. These are calibration comparisons,
not held-out accuracy or end-to-end device latency. Physical microphone and mobile
validation, real hosted-provider setup, and deployed smoke tests remain outstanding.
See [audio evaluation](https://github.com/Lojhan/cadence/blob/main/docs/AUDIO_EVALUATION.md)
for scope, historical measurements, and limitations.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. Companion dependencies are pinned
to this release. Container images are tested on native AMD64 and ARM64 runners
before their shared manifest is published.

No database schema migrations were added since alpha.1. Back up before upgrading.
Alpha.1 cannot import full version 2 archives; individual-song exports remain
version 1. See [portability](https://github.com/Lojhan/cadence/blob/main/docs/PORTABILITY.md)
and [operations](https://github.com/Lojhan/cadence/blob/main/docs/OPERATIONS.md).
