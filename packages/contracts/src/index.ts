import { z } from "zod";

export const preferencesSchema = z
  .object({
    hand: z.enum(["right", "left"]).default("right"),
    theme: z.enum(["system", "light", "dark"]).default("system"),
    numbers: z.boolean().default(true),
    profile: z.enum(["gentle", "balanced", "precise"]).default("balanced"),
    loop: z.boolean().default(true),
    lastSongId: z.string().max(100).default("catalog:four"),
    diagramSize: z.enum(["standard", "large"]).default("standard"),
    voicings: z.record(z.string().max(16), z.string().max(80)).default({}),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const songInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    chart: z.string().min(1).max(1_048_576),
    attribution: z.string().trim().max(500).default(""),
  })
  .strict();
export type SongInput = z.infer<typeof songInputSchema>;
export interface Song {
  sourceChart?: string;
  id: string;
  title: string;
  chords: string[];
  attribution: string;
  revision: number;
  catalog: boolean;
}
export interface Principal {
  userId: string;
  mode: "local" | "hosted";
}
export type ErrorCode =
  | "INVALID_CHART"
  | "UNSUPPORTED_CHORD"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "STORAGE_UNAVAILABLE";
export class CadenceError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CadenceError";
  }
}

export interface StoredPreferences {
  values: Preferences;
  revision: number;
}
export const positionSchema = z
  .object({
    songId: z.string().min(1),
    songRevision: z.number().int().positive(),
    index: z.number().int().nonnegative(),
    completed: z.boolean(),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type Position = z.infer<typeof positionSchema>;
export const saveSongSchema = songInputSchema
  .extend({
    id: z.string().min(1).optional(),
    revision: z.number().int().positive().optional(),
  })
  .strict();
export const savePreferencesSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    values: preferencesSchema,
  })
  .strict();
const archiveV1Schema = z
  .object({
    version: z.literal(1),
    preferences: preferencesSchema,
    songs: z
      .array(
        songInputSchema.extend({
          key: z.string().max(100).optional(),
          position: z
            .object({
              index: z.number().int().nonnegative(),
              completed: z.boolean(),
            })
            .strict()
            .optional(),
        }),
      )
      .max(1000),
  })
  .strict();
export const catalogPositionSchema = z
  .object({
    songId: z.string().min(1).max(100),
    chords: z.array(z.string().min(1).max(40)).min(1).max(10000),
    index: z.number().int().nonnegative(),
    completed: z.boolean(),
  })
  .strict();
export type CatalogPosition = z.infer<typeof catalogPositionSchema>;
export const archiveSchema = z.discriminatedUnion("version", [
  archiveV1Schema,
  archiveV1Schema
    .extend({
      version: z.literal(2),
      catalogPositions: z.array(catalogPositionSchema).max(1000),
    })
    .strict(),
]);
export type Archive = z.infer<typeof archiveSchema>;
export interface CadenceGateway {
  library(): Promise<Song[]>;
  preferences(): Promise<StoredPreferences>;
  savePreferences(input: StoredPreferences): Promise<StoredPreferences>;
  saveSong(
    input: SongInput & { id?: string; revision?: number },
  ): Promise<Song>;
  deleteSong(id: string, revision: number): Promise<void>;
  position(songId: string): Promise<Position | null>;
  savePosition(input: Position): Promise<Position>;
  exportData(): Promise<Archive>;
  importData(input: unknown): Promise<void>;
}
