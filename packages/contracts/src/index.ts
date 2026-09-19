import { z } from "zod";

export const preferencesSchema = z
  .object({
    hand: z.enum(["right", "left"]).default("right"),
    theme: z.enum(["system", "light", "dark"]).default("system"),
    numbers: z.boolean().default(true),
    profile: z.enum(["gentle", "balanced", "precise"]).default("balanced"),
    loop: z.boolean().default(true),
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
