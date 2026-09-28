Cadence 0.1.0-alpha.21 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.20:

- Tablature is one continuous horizontal score. String names remain fixed over
  a solid background and fading edge while the player scrolls freely. Audio
  matches bring the current note group into view; fret numbers keep the app's
  sans-serif type, while string and chord labels use its serif type.
- Saved ASCII tab can carry optional chord changes and downstroke, upstroke or
  pluck cues with note values. These are visual playing cues; Rust/WASM still
  scores the notes, not stroke direction or rhythmic timing.
- The four original starter tab exercises now show chord changes and original
  down/up eighth-note practice cues. Their catalog revisions advance, so
  earlier saved progress for those exercises resets to the beginning. Personal
  charts, archives and the 51 chord-only catalog songs remain available.

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
