Cadence 0.1.0-alpha.20 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.19:

- Complete six-string ASCII tablature can be imported, displayed, practiced at
  the player's pace, saved, and exported. Rust/WASM checks single absolute
  pitches and simultaneous note groups. Unsupported technique notation and
  rhythm scoring are outside this release.
- Four original chord-voicing tab exercises join the shared starter catalog:
  *Knockin' on Heaven's Door*, *Amazing Grace*, *When the Saints Go Marching In*,
  and *Jingle Bells*. The Dylan exercise uses only a common chord loop and new
  open-chord voicings. It includes no lyrics, melody, solo, or copied tab; the
  composition remains copyrighted. Sources and scope are recorded in
  `docs/catalog/tab-practices.md`.
- The existing 51 chord-only catalog songs remain available. Personal chord
  charts and existing archives continue to work.

Recognition remains **experimental**. Synthetic tab tests, including the
G–D–Am–C exercise, do not establish accuracy on a live guitar or mobile device.
The existing chord calibration results and limitations remain in
`docs/AUDIO_EVALUATION.md`; this release makes no new accuracy claim. Physical
guitar playthrough, device checks, and country-specific rights review remain
open. The hosted distribution's prior Clerk and Stripe sandbox checks do not
establish live payment readiness.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the
source commit, package hashes and versions, WASM hash and protocol,
content-addressed catalog version, and required migration hashes. No database
schema migration is added. Back up an existing database before upgrading. See
`docs/PORTABILITY.md` and `docs/OPERATIONS.md` for archive and upgrade details.
