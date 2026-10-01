Cadence 0.1.0-alpha.25 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.24:

- Practice now includes a metronome with 40–240 BPM, 1–8 beats per measure,
  and an optional accented first beat. It uses Web Audio clock scheduling and
  stops on practice navigation, backgrounding, and audio interruption.
- The accented-beat checkbox follows Cadence's light/dark controls and retains
  keyboard focus and native checkbox semantics.
- A small replay of checksum-verified EGSet12 electric-guitar performances is
  documented in `docs/AUDIO_EVALUATION.md`. It exposed short-note misses and a
  late match; the recognition engine is unchanged from alpha.24.
- Saved charts, catalog data, and the database schema are unchanged from alpha.24.

Recognition remains **experimental**. The EGSet12 smoke result is not a release
accuracy claim. Physical guitar playthrough, metronome speaker-to-microphone
bleed, device checks, and country-specific rights review remain open. The hosted
distribution's prior Clerk and Stripe sandbox checks do not establish live
payment readiness.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the
source commit, package hashes and versions, WASM hash and protocol,
content-addressed catalog version, and required migration hashes. No database
schema migration is added. Back up an existing database before upgrading. See
`docs/PORTABILITY.md` and `docs/OPERATIONS.md` for archive and upgrade details.
