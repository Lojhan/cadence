Cadence 0.1.0-alpha.7 is an MIT-licensed preview for self-hosting and integration.
It includes the reviewed practice UI, local Rust/WASM recognition,
SQLite/PostgreSQL persistence, and container backup tools.

Changes since alpha.6:

- Rust/WASM detection now uses spectral whitening and iterative multi-pitch estimation before chord confirmation.
- Pitch estimation is independent of the expected chord and retains octave information until the final chroma projection.
- Buttons across practice, settings, account and authentication share light/dark hover colors; chord arrows remain unboxed.
- Disabled buttons do not acquire hover colors; touch presses have matching feedback.

Alpha.5 also introduced per-input microphone boost and restored keyboard focus to
modal openers. Input boost defaults off and can help quiet capture, but it also
amplifies noise. The reported iPhone/iPad Safari capture issue still needs a
physical-device retest; the synthetic quiet-input checks do not prove it is fixed.

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

No database schema migrations were added since alpha.5. Back up before upgrading.
Alpha.1 cannot import full version 2 archives; individual-song exports remain
version 1. See [portability](https://github.com/Lojhan/cadence/blob/main/docs/PORTABILITY.md)
and [operations](https://github.com/Lojhan/cadence/blob/main/docs/OPERATIONS.md).
