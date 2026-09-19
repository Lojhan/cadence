# Self-hosting operations

Cadence runs without Clerk, Stripe, or external accounts. The local instance is a
single personal workspace; anyone who can reach it can use that workspace. Bind
to localhost or protect a remote installation with your own access gateway.

## Build and run

The published alpha image is `ghcr.io/lojhan/cadence:0.1.0-alpha.6`. To build an
equivalent local image from this checkout:

```sh
docker build -f deploy/Dockerfile -t cadence:local .
docker run --detach --name cadence --restart unless-stopped \
  --publish 127.0.0.1:3000:3000 --volume cadence-data:/data cadence:local
```

Open `http://localhost:3000`. The named volume keeps the SQLite database across
container replacement. The application runs as UID 1000. A bind-mounted data
directory must be writable by that user. No secrets are needed for SQLite.

Set `PUBLIC_ORIGIN` to the exact browser origin if it changes, including scheme
and port. Remote microphone access requires HTTPS; localhost is a browser
exception. Terminate TLS at your reverse proxy and preserve the original Host
header. `/health` checks the process; `/ready` also checks database access.

`DATABASE_URL=file:/data/cadence.db` is the default. A PostgreSQL URL selects the
PostgreSQL adapter. Managed PostgreSQL must use the TLS settings required by its
provider. `deploy/compose.postgres.yml` shows a two-container deployment; provide a URL-safe `POSTGRES_PASSWORD` through your local environment.

## Upgrade

Pin an image version or digest. Back up the database before changing versions.
An empty database initializes itself; an existing database refuses to start when
it needs a migration. Stop the old container, then run the new image's migration
command against the same volume before replacing the application container:

```sh
docker stop cadence
docker run --rm --volume cadence-data:/data cadence:local node server/admin.mjs migrate
```

Use the same `DATABASE_URL` when migrating PostgreSQL. Migrations have a
transactional advisory lock. Never run an older application against a newer
schema; roll back using the matching image and pre-upgrade backup.

## SQLite backup and restore

The backup command uses SQLite's online backup API and is safe while Cadence is
running. It refuses to overwrite a file:

```sh
docker exec cadence node server/admin.mjs backup /data/cadence-backup.db
docker cp cadence:/data/cadence-backup.db ./cadence-backup.db
```

Copy the backup off the application volume. A backup on the same disk is not
protection against disk loss. To restore, stop the application and use a new,
empty volume; restore validates SQLite integrity and refuses an existing target.

```sh
docker volume create cadence-restored
docker run --rm --volume cadence-restored:/data \
  --volume "$PWD/cadence-backup.db:/backup.db:ro" cadence:local \
  node server/admin.mjs restore /backup.db
```

Start the matching application image with `cadence-restored:/data`. Keep the old
volume until the restored library and preferences have been checked.

## PostgreSQL backup and restore

Use your provider's backups or PostgreSQL's `pg_dump --format=custom` and
`pg_restore --exit-on-error` into a new empty database. Pass credentials through
your secret manager or `.pgpass`; do not commit them. Verify the restored database
with the matching application before directing traffic to it. The SQLite admin
backup command deliberately refuses PostgreSQL URLs.

## Local validation

```sh
pnpm container:build
pnpm test:container
```

The Poku suite verifies a fresh provider-free installation, non-root execution,
database persistence after restart, backup creation, and Host validation. For
Podman, build with `--format docker` to retain the image healthcheck and run with
`CONTAINER_ENGINE=podman pnpm test:container`.

## Generating schema migrations

For development, select the dialect explicitly:

```sh
pnpm db:generate sqlite
pnpm db:generate postgres
```

These commands generate SQL and Drizzle metadata from the corresponding schema;
they do not connect to or modify a database. Review and commit generated files
for both dialects when changing shared persistence behavior. Existing
`db:generate:sqlite` and `db:generate:postgres` commands remain available.
Use `pnpm db:migrate` with the intended `DATABASE_URL` to apply migrations.
