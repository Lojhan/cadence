# Coordinated alpha releases

Run releases from a clean Git checkout with the pinned toolchains. The builder
uses the source commit and records whether the working tree was dirty; local
experiments must not be described as builds of an unchanged commit.

`CADENCE_RELEASE_VERSION=0.1.0-alpha.6 pnpm check` builds and tests all nine
packages together. `artifacts/release/` contains their tarballs, `RELEASE.json`,
and `SHA256SUMS`. The manifest records:

- Source commit and working-tree status.
- Package versions, asset filenames, and SHA-256 hashes.
- Engine/protocol versions and the shipped WASM hash.
- Catalog version as the SHA-256 of the serialized default-song data, plus song revisions.
- Required migration names and hashes, and the complete migration sequence for SQLite and PostgreSQL.

An existing database must match the required migration hash, or run the release's
migration command before application startup. See [operations](OPERATIONS.md).
The release notes also describe archive and upgrade compatibility.

Update `docs/ALPHA_RELEASE.md` for the intended version and changes. Its first
line must start with `Cadence <version> is `; the workflow checks this before
building, so stale release descriptions cannot be published accidentally.
Run `CADENCE_RELEASE_VERSION=<version> node tooling/verify-release-notes.ts` locally.

Dispatch `.github/workflows/release.yml` with a new, unused alpha version after
committing and pushing the reviewed changes. The workflow performs full checks,
PostgreSQL parity, and native AMD64/ARM64 container tests before publishing package
assets and the combined container image. Never reuse a published version.

After publication, verify the downloaded checksums and installed container,
update the documented image tag, and update every public-package pin in the
private distribution. Run the private PostgreSQL and built-app checks against
the published packages before committing that dependency update.

Recognition/device gates remain independent of packaging checks. Alpha release
notes must retain the experimental status until those gates are actually met.
