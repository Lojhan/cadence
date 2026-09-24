Cadence 0.1.0-alpha.19 is an MIT-licensed preview for self-hosting and integration.
It includes the responsive tuner, local Rust/WASM recognition,
SQLite/PostgreSQL persistence, and container backup tools.

Changes since alpha.18:

- Thirty-three additional chord-only songs join the shared starter catalog,
  bringing it to 51. Source and transcription reviews are recorded in
  `docs/catalog/imported-review.json`.
- The other 49 candidates and their outstanding source or rights checks are
  recorded in `docs/catalog/pending-review.json`.

The new charts use the CC0 Public Domain Song Anthology and the CC0
Public Domain Christmas Songs ChordPro collection. Source maintainers identify
the underlying versions as public domain. The charts contain no lyrics,
melody notation, or recordings. Physical guitar playthrough
and country-specific rights review remain advisable before promoting this
starter catalog beyond the current alpha audience.

Per-input microphone boost can help quiet capture, but it also amplifies noise.
The tuner and sound-check synthetic tests do not prove real-guitar accuracy or
fix the reported iPhone/iPad Safari microphone level; physical-device retests remain necessary.

Recognition remains **experimental**. No profile meets every release target.
On the corrected calibration subset, Balanced recognizes 102/116 qualifying strums
and incorrectly accepts 7/656 related targets. These are calibration comparisons,
not held-out accuracy or end-to-end device latency. Broader Balanced results improve
from 557 to 573 of 889 positives and from 5 to 2 false matches out of 676.
Individual regressions remain and are listed in the evaluation report. Physical microphone and mobile
validation remain outstanding. The private hosted distribution has verified
development Clerk sign-in and Stripe sandbox purchase, refund and renewal journeys;
these do not establish live payment readiness or recognition accuracy.
See [audio evaluation](https://github.com/Lojhan/cadence/blob/main/docs/AUDIO_EVALUATION.md)
for scope, historical measurements, and limitations.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the source
commit, package hashes/versions, WASM hash and protocol, content-addressed catalog
version, and required migration hashes for both databases. Companion dependencies are pinned
to this release. Container images are tested on native AMD64 and ARM64 runners
before their shared manifest is published.

No database schema migrations were added since alpha.18. Back up before upgrading.
Alpha.1 cannot import full version 2 archives; individual-song exports remain
version 1. See [portability](https://github.com/Lojhan/cadence/blob/main/docs/PORTABILITY.md)
and [operations](https://github.com/Lojhan/cadence/blob/main/docs/OPERATIONS.md).
