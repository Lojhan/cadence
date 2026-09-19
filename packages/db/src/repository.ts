import { createHash } from "node:crypto";
import type { Repository } from "@cadence/application";
import {
  CadenceError,
  type Position,
  preferencesSchema,
  type Song,
} from "@cadence/contracts";
import { type SQL, sql } from "drizzle-orm";
export type Query = (query: SQL) => Promise<Record<string, unknown>[]>;
function conflict() {
  return new CadenceError(
    "CONFLICT",
    "This record changed. Reload and try again.",
  );
}
export function repository(query: Query): Repository {
  async function events(song: Song) {
    await query(
      sql`DELETE FROM song_events WHERE song_id = ${song.id} RETURNING song_id`,
    );
    for (const [ordinal, symbol] of song.chords.entries())
      await query(
        sql`INSERT INTO song_events (song_id, ordinal, symbol) VALUES (${song.id}, ${ordinal}, ${symbol}) RETURNING ordinal`,
      );
  }
  async function hydrate(row: Record<string, unknown>): Promise<Song> {
    const notes = await query(
      sql`SELECT symbol FROM song_events WHERE song_id = ${row.id} ORDER BY ordinal`,
    );
    return {
      id: String(row.id),
      title: String(row.title),
      sourceChart: String(row.source_chart || ""),
      attribution: String(row.attribution),
      revision: Number(row.revision),
      catalog: Number(row.catalog) === 1,
      chords: notes.map((note) => String(note.symbol)),
    };
  }
  return {
    async createUser(id) {
      await query(
        sql`INSERT INTO users (id, created_at) VALUES (${id}, ${new Date().toISOString()}) ON CONFLICT (id) DO NOTHING RETURNING id`,
      );
    },
    async hasUser(id) {
      return (
        (await query(sql`SELECT id FROM users WHERE id = ${id}`)).length > 0
      );
    },
    async seedCatalog(songs) {
      for (const song of songs) {
        const inserted = await query(
          sql`INSERT INTO songs (id, owner_id, catalog, title, attribution, revision, source_chart) VALUES (${song.id}, NULL, 1, ${song.title}, ${song.attribution}, ${song.revision}, ${song.sourceChart ?? song.chords.join(" ")}) ON CONFLICT (id) DO NOTHING RETURNING id`,
        );
        if (inserted.length) await events(song);
      }
      await query(
        sql`INSERT INTO catalog_releases (version, hash) VALUES ('1', ${createHash("sha256").update(JSON.stringify(songs)).digest("hex")}) ON CONFLICT (version) DO NOTHING RETURNING version`,
      );
    },
    async listSongs(userId) {
      const rows = await query(
        sql`SELECT * FROM songs WHERE owner_id = ${userId} OR catalog = 1 ORDER BY catalog DESC, title, id`,
      );
      const result: Song[] = [];
      for (const row of rows) result.push(await hydrate(row));
      return result;
    },
    async getSong(userId, id) {
      const [row] = await query(
        sql`SELECT * FROM songs WHERE id = ${id} AND (owner_id = ${userId} OR catalog = 1)`,
      );
      return row ? hydrate(row) : null;
    },
    async putSong(userId, song, expected) {
      const rows =
        expected === 0
          ? await query(
              sql`INSERT INTO songs (id, owner_id, catalog, title, attribution, revision, source_chart) VALUES (${song.id}, ${userId}, 0, ${song.title}, ${song.attribution}, ${song.revision}, ${song.sourceChart ?? song.chords.join(" ")}) ON CONFLICT (id) DO NOTHING RETURNING id`,
            )
          : await query(
              sql`UPDATE songs SET source_chart = ${song.sourceChart ?? song.chords.join(" ")}, title = ${song.title}, attribution = ${song.attribution}, revision = ${song.revision} WHERE id = ${song.id} AND owner_id = ${userId} AND revision = ${expected} RETURNING id`,
            );
      if (!rows.length) throw conflict();
      await events(song);
      await query(
        sql`DELETE FROM practice_positions WHERE song_id = ${song.id} RETURNING song_id`,
      );
    },
    async deleteSong(userId, id, revision) {
      if (
        !(
          await query(
            sql`DELETE FROM songs WHERE id = ${id} AND owner_id = ${userId} AND revision = ${revision} RETURNING id`,
          )
        ).length
      )
        throw conflict();
    },
    async getPreferences(userId) {
      const [row] = await query(
        sql`SELECT "values", revision FROM preferences WHERE user_id = ${userId}`,
      );
      return row
        ? {
            values: preferencesSchema.parse(JSON.parse(String(row.values))),
            revision: Number(row.revision),
          }
        : { values: preferencesSchema.parse({}), revision: 0 };
    },
    async putPreferences(userId, value, expected) {
      const values = JSON.stringify(value.values);
      const rows =
        expected === 0
          ? await query(
              sql`INSERT INTO preferences (user_id, "values", revision) VALUES (${userId}, ${values}, ${value.revision}) ON CONFLICT (user_id) DO NOTHING RETURNING user_id`,
            )
          : await query(
              sql`UPDATE preferences SET "values" = ${values}, revision = ${value.revision} WHERE user_id = ${userId} AND revision = ${expected} RETURNING user_id`,
            );
      if (!rows.length) throw conflict();
    },
    async getPosition(userId, songId) {
      const [row] = await query(
        sql`SELECT * FROM practice_positions WHERE user_id = ${userId} AND song_id = ${songId}`,
      );
      return row
        ? ({
            songId,
            songRevision: Number(row.song_revision),
            index: Number(row.ordinal),
            completed: Number(row.completed) === 1,
            revision: Number(row.revision),
          } satisfies Position)
        : null;
    },
    async putPosition(userId, value, expected) {
      const rows =
        expected === 0
          ? await query(
              sql`INSERT INTO practice_positions (user_id, song_id, song_revision, ordinal, completed, revision) VALUES (${userId}, ${value.songId}, ${value.songRevision}, ${value.index}, ${Number(value.completed)}, ${value.revision}) ON CONFLICT (user_id, song_id) DO NOTHING RETURNING user_id`,
            )
          : await query(
              sql`UPDATE practice_positions SET song_revision = ${value.songRevision}, ordinal = ${value.index}, completed = ${Number(value.completed)}, revision = ${value.revision} WHERE user_id = ${userId} AND song_id = ${value.songId} AND revision = ${expected} RETURNING user_id`,
            );
      if (!rows.length) throw conflict();
    },
  };
}
