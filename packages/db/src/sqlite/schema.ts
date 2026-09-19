import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
});
export const preferences = sqliteTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  values: text("values").notNull(),
  revision: integer("revision").notNull().default(1),
});
export const songs = sqliteTable(
  "songs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    catalog: integer("catalog").notNull(),
    title: text("title").notNull(),
    attribution: text("attribution").notNull(),
    revision: integer("revision").notNull(),
  },
  (t) => [
    check(
      "song_scope",
      sql`(${t.catalog} = 1 AND ${t.ownerId} IS NULL) OR (${t.catalog} = 0 AND ${t.ownerId} IS NOT NULL)`,
    ),
  ],
);
export const songEvents = sqliteTable(
  "song_events",
  {
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    symbol: text("symbol").notNull(),
  },
  (t) => [primaryKey({ columns: [t.songId, t.ordinal] })],
);
export const positions = sqliteTable(
  "practice_positions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    songRevision: integer("song_revision").notNull(),
    ordinal: integer("ordinal").notNull(),
    completed: integer("completed").notNull(),
    revision: integer("revision").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.songId] })],
);
export const catalogReleases = sqliteTable("catalog_releases", {
  version: text("version").primaryKey(),
  hash: text("hash").notNull(),
});
