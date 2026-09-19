import {
  type Archive,
  archiveSchema,
  CadenceError,
  type CatalogPosition,
  type Position,
  type Principal,
  positionSchema,
  preferencesSchema,
  type Song,
  type StoredPreferences,
  savePreferencesSchema,
  saveSongSchema,
} from "@cadence/contracts";
import { defaultSongs, parseChart } from "@cadence/music";
export interface Repository {
  createUser(id: string): Promise<void>;
  hasUser(id: string): Promise<boolean>;
  seedCatalog(songs: readonly Song[]): Promise<void>;
  listSongs(userId: string): Promise<Song[]>;
  getSong(userId: string, id: string): Promise<Song | null>;
  putSong(userId: string, song: Song, expectedRevision: number): Promise<void>;
  deleteSong(userId: string, id: string, revision: number): Promise<void>;
  getPreferences(userId: string): Promise<StoredPreferences>;
  putPreferences(
    userId: string,
    value: StoredPreferences,
    expectedRevision: number,
  ): Promise<void>;
  getPosition(userId: string, songId: string): Promise<Position | null>;
  putPosition(
    userId: string,
    value: Position,
    expectedRevision: number,
  ): Promise<void>;
}
export interface Store {
  transaction<T>(run: (repository: Repository) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export function createApplication(store: Store, newId: () => string) {
  function authorize(principal: Principal) {
    if (!principal.userId || !["local", "hosted"].includes(principal.mode))
      throw new CadenceError("UNAUTHORIZED", "Sign in to continue");
  }
  async function run<T>(
    principal: Principal,
    work: (repo: Repository) => Promise<T>,
  ) {
    authorize(principal);
    return store.transaction(async (repo) => {
      if (!(await repo.hasUser(principal.userId)))
        throw new CadenceError("UNAUTHORIZED", "User is not provisioned");
      return work(repo);
    });
  }
  async function owned(repo: Repository, userId: string, id: string) {
    const song = await repo.getSong(userId, id);
    if (!song) throw new CadenceError("NOT_FOUND", "Song not found");
    if (song.catalog)
      throw new CadenceError(
        "CONFLICT",
        "Default music is read-only. Save a copy.",
      );
    return song;
  }
  return {
    async provision(principal: Principal) {
      authorize(principal);
      return store.transaction(async (repo) => {
        await repo.createUser(principal.userId);
        await repo.seedCatalog(defaultSongs);
      });
    },
    library(principal: Principal) {
      return run(principal, (repo) => repo.listSongs(principal.userId));
    },
    preferences(principal: Principal) {
      return run(principal, (repo) => repo.getPreferences(principal.userId));
    },
    async savePreferences(principal: Principal, raw: unknown) {
      const input = savePreferencesSchema.parse(raw);
      return run(principal, async (repo) => {
        const next = { values: input.values, revision: input.revision + 1 };
        await repo.putPreferences(principal.userId, next, input.revision);
        return next;
      });
    },
    async saveSong(principal: Principal, raw: unknown) {
      const input = saveSongSchema.parse(raw);
      const { chords } = parseChart(input.chart);
      return run(principal, async (repo) => {
        if (input.id) await owned(repo, principal.userId, input.id);
        if (input.id && !input.revision)
          throw new CadenceError("CONFLICT", "Song revision is required");
        const expected = input.id ? (input.revision ?? 0) : 0;
        const song: Song = {
          id: input.id ?? newId(),
          title: input.title,
          chords,
          attribution: input.attribution,
          revision: expected + 1,
          catalog: false,
          sourceChart: input.chart,
        };
        await repo.putSong(principal.userId, song, expected);
        return song;
      });
    },
    deleteSong(principal: Principal, id: string, revision: number) {
      return run(principal, async (repo) => {
        await owned(repo, principal.userId, id);
        await repo.deleteSong(principal.userId, id, revision);
      });
    },
    position(principal: Principal, songId: string) {
      return run(principal, async (repo) => {
        const song = await repo.getSong(principal.userId, songId);
        if (!song) throw new CadenceError("NOT_FOUND", "Song not found");
        const position = await repo.getPosition(principal.userId, songId);
        return position?.songRevision === song.revision ? position : null;
      });
    },
    async savePosition(principal: Principal, raw: unknown) {
      const input = positionSchema.parse(raw);
      return run(principal, async (repo) => {
        const song = await repo.getSong(principal.userId, input.songId);
        if (!song) throw new CadenceError("NOT_FOUND", "Song not found");
        if (song.revision !== input.songRevision)
          throw new CadenceError(
            "CONFLICT",
            "Song changed. Reload it to continue.",
          );
        if (input.index >= song.chords.length)
          throw new CadenceError(
            "INVALID_CHART",
            "Position is outside the song",
          );
        const next = { ...input, revision: input.revision + 1 };
        await repo.putPosition(principal.userId, next, input.revision);
        return next;
      });
    },
    exportData(principal: Principal): Promise<Archive> {
      return run(principal, async (repo) => {
        const songs: Archive["songs"] = [];
        const catalogPositions: CatalogPosition[] = [];
        for (const song of await repo.listSongs(principal.userId)) {
          const position = await repo.getPosition(principal.userId, song.id);
          if (song.catalog) {
            if (position?.songRevision === song.revision)
              catalogPositions.push({
                songId: song.id,
                chords: song.chords,
                index: position.index,
                completed: position.completed,
              });
            continue;
          }
          songs.push({
            key: song.id,
            title: song.title,
            chart: song.sourceChart || song.chords.join(" "),
            attribution: song.attribution,
            ...(position?.songRevision === song.revision
              ? {
                  position: {
                    index: position.index,
                    completed: position.completed,
                  },
                }
              : {}),
          });
        }
        return {
          version: 2,
          catalogPositions,
          preferences: (await repo.getPreferences(principal.userId)).values,
          songs,
        };
      });
    },
    async importData(principal: Principal, raw: unknown) {
      if (new TextEncoder().encode(JSON.stringify(raw)).length > 10_485_760)
        throw new CadenceError("INVALID_CHART", "Archive exceeds 10 MB");
      const input = archiveSchema.parse(raw);
      const songs = input.songs.map((song) => ({
        ...song,
        chords: parseChart(song.chart).chords,
      }));
      return run(principal, async (repo) => {
        let lastSongId = input.preferences.lastSongId.startsWith("catalog:")
          ? input.preferences.lastSongId
          : "catalog:four";
        const seen = new Set<string>();
        for (const song of songs) {
          if (song.key && seen.has(song.key))
            throw new CadenceError(
              "INVALID_CHART",
              "Duplicate song key in archive",
            );
          if (song.key) seen.add(song.key);
          const id = newId();
          await repo.putSong(
            principal.userId,
            {
              id,
              title: song.title,
              attribution: song.attribution,
              chords: song.chords,
              sourceChart: song.chart,
              revision: 1,
              catalog: false,
            },
            0,
          );
          if (song.position) {
            if (song.position.index >= song.chords.length)
              throw new CadenceError(
                "INVALID_CHART",
                "Archive position is outside the song",
              );
            await repo.putPosition(
              principal.userId,
              {
                songId: id,
                songRevision: 1,
                index: song.position.index,
                completed: song.position.completed,
                revision: 1,
              },
              0,
            );
          }
          if (song.key === input.preferences.lastSongId) lastSongId = id;
        }
        if (input.version === 2) {
          const catalogIds = new Set<string>();
          for (const position of input.catalogPositions) {
            if (catalogIds.has(position.songId))
              throw new CadenceError(
                "INVALID_CHART",
                "Duplicate catalog position in archive",
              );
            catalogIds.add(position.songId);
            if (position.index >= position.chords.length)
              throw new CadenceError(
                "INVALID_CHART",
                "Catalog position is outside the song",
              );
            const song = await repo.getSong(principal.userId, position.songId);
            // Catalog content is owned by the installed release. A changed or
            // missing sequence cannot safely inherit a position from an archive.
            if (
              !song?.catalog ||
              song.chords.length !== position.chords.length ||
              !song.chords.every(
                (chord, index) => chord === position.chords[index],
              )
            )
              continue;
            const previous = await repo.getPosition(principal.userId, song.id);
            await repo.putPosition(
              principal.userId,
              {
                songId: song.id,
                songRevision: song.revision,
                index: position.index,
                completed: position.completed,
                revision: (previous?.revision ?? 0) + 1,
              },
              previous?.revision ?? 0,
            );
          }
        }
        if (!(await repo.getSong(principal.userId, lastSongId)))
          lastSongId = "catalog:four";
        const old = await repo.getPreferences(principal.userId);
        await repo.putPreferences(
          principal.userId,
          {
            values: {
              ...preferencesSchema.parse(input.preferences),
              lastSongId,
            },
            revision: old.revision + 1,
          },
          old.revision,
        );
      });
    },
  };
}
