Cadence 0.1.0-alpha.26 is an MIT-licensed preview for self-hosting and integration.

Changes since alpha.25:

- The web app updates TanStack Start to 1.168.60, React Router to 1.170.41,
  and the resolved Start server core to 1.169.39 for the upstream XSS fix.
- Single-note tab practice now confirms from two fresh agreeing pitch analyses
  instead of waiting for the tuner's display reading and an additional hold.
  The display tuner retains its smoothing.
- Short subframe attack detection supports quick repetitions of the same note.
  Harmonic-series checks distinguish a weak low fundamental from a strong third
  overtone and support a higher note while a lower string rings.
- A checksum-verified EGSet12 electric-guitar replay and its frozen note cases
  are documented in `docs/evaluation/egset12-notes.md`. On this small selected
  probe, 9/9 isolated notes matched and 0/468 wrong targets were accepted;
  7/8 rapid notes matched by annotated release. These calibration results are
  not held-out accuracy or device-latency claims.
- The chord algorithm, saved charts, catalog data, and database schema are
  unchanged from alpha.25.

Recognition remains **experimental**. Physical guitar playthrough, speaker-to-
microphone bleed, device checks, held-out recordings, and country-specific
rights review remain open. The hosted distribution's prior Clerk and Stripe
sandbox checks do not establish live payment readiness.

The release includes nine ESM packages with TypeScript declarations, matching
WASM and migration assets, and SHA-256 checksums. `RELEASE.json` records the
source commit, package hashes and versions, WASM hash and protocol,
content-addressed catalog version, and required migration hashes. No database
schema migration is added. Back up an existing database before upgrading. See
`docs/PORTABILITY.md` and `docs/OPERATIONS.md` for archive and upgrade details.
