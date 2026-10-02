Cadence 0.1.0-alpha.27 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.26:

- Chord names above tablature open a compact preview of the default fingering.
  The preview uses the existing chord diagram, song tuning, handedness, and
  finger-number preference.
- Tapping a tablature column seeks practice to that note in either direction.
  Keyboard activation works as well. Repeated seeks and interrupted recognition
  confirmations use a fresh target epoch so stale matches cannot advance practice.
- The microphone and metronome controls, recognition algorithm, saved charts,
  catalog data, and database schema are unchanged from alpha.26.

Recognition remains **experimental**. Physical guitar playthrough, speaker-to-
microphone bleed, iPhone Safari audio retesting, device checks, held-out
recordings, and country-specific
rights review remain open. The hosted distribution's prior Clerk and Stripe
sandbox checks do not establish live payment readiness.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the
source commit, package hashes and versions, WASM hash and protocol,
content-addressed catalog version, and required migration hashes. No database
schema migration is added. Back up an existing database before upgrading. See
`docs/PORTABILITY.md` and `docs/OPERATIONS.md` for archive and upgrade details.
