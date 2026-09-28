Cadence 0.1.0-alpha.24 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.23:

- The practice modal now covers tablature annotations and uses icon-only tabs
  with accessible labels.
- Both tuner modes sit slightly higher on mobile. The string-by-string tuner
  fits all six strings in shorter desktop windows.
- The score, catalog data, recognition behavior, saved charts, and database
  schema are unchanged from alpha.23.

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
