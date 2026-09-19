Cadence 0.1.0-alpha.6 is an MIT-licensed preview for self-hosting and integration.
It includes the reviewed practice UI, local Rust/WASM recognition,
SQLite/PostgreSQL persistence, and container backup tools.

Changes since alpha.5:

- Chord, fretboard, and timeline move and fade together when navigating forward or backward.
- Modal panels use subtle directional transitions, with reduced-motion support.
- Exiting animation frames are hidden from assistive technology and cannot receive input.
- Decorative panel headings and redundant subtitles are removed.
- Hosted integrations can supply the complete account panel inside the practice modal.

Alpha.5 also introduced per-input microphone boost and restored keyboard focus to
modal openers. Input boost defaults off and can help quiet capture, but it also
amplifies noise. The reported iPhone/iPad Safari capture issue still needs a
physical-device retest; the synthetic quiet-input checks do not prove it is fixed.

Recognition remains **experimental**. No profile meets every release target.
On the corrected calibration subset, Balanced recognizes 97/116 qualifying strums
and incorrectly accepts 10/656 related targets. These are calibration comparisons,
not held-out accuracy or end-to-end device latency. Physical microphone and mobile
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
