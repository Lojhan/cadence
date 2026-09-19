import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
});
export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  values: text("values").notNull(),
  revision: integer("revision").notNull().default(1),
});
export const songs = pgTable(
  "songs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    catalog: integer("catalog").notNull(),
    title: text("title").notNull(),
    sourceChart: text("source_chart").notNull().default(""),
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
export const songEvents = pgTable(
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
export const positions = pgTable(
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
export const catalogReleases = pgTable("catalog_releases", {
  version: text("version").primaryKey(),
  hash: text("hash").notNull(),
});
