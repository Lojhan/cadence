import {
  archiveSchema,
  positionSchema,
  savePreferencesSchema,
  saveSongSchema,
} from "@cadence/contracts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { call } from "../server/service.server";
export const library = createServerFn({ method: "GET" }).handler(() =>
  call((app, actor) => app.library(actor)),
);
export const preferences = createServerFn({ method: "GET" }).handler(() =>
  call((app, actor) => app.preferences(actor)),
);
export const savePreferences = createServerFn({ method: "POST" })
  .validator(savePreferencesSchema)
  .handler(({ data }) =>
    call((app, actor) => app.savePreferences(actor, data)),
  );
export const saveSong = createServerFn({ method: "POST" })
  .validator(saveSongSchema)
  .handler(({ data }) => call((app, actor) => app.saveSong(actor, data)));
export const deleteSong = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ id: z.string().min(1), revision: z.number().int().positive() })
      .strict(),
  )
  .handler(({ data }) =>
    call((app, actor) => app.deleteSong(actor, data.id, data.revision)),
  );
export const position = createServerFn({ method: "GET" })
  .validator(z.string().min(1))
  .handler(({ data }) => call((app, actor) => app.position(actor, data)));
export const savePosition = createServerFn({ method: "POST" })
  .validator(positionSchema)
  .handler(({ data }) => call((app, actor) => app.savePosition(actor, data)));
export const exportData = createServerFn({ method: "GET" }).handler(() =>
  call((app, actor) => app.exportData(actor)),
);
export const importData = createServerFn({ method: "POST" })
  .validator(archiveSchema)
  .handler(({ data }) => call((app, actor) => app.importData(actor, data)));
export const bootstrap = createServerFn({ method: "GET" }).handler(() =>
  call(async (app, actor) => {
    const [songs, settings] = await Promise.all([
      app.library(actor),
      app.preferences(actor),
    ]);
    return {
      songs,
      preferences: settings,
      position: await app.position(
        actor,
        songs.some((song) => song.id === settings.values.lastSongId)
          ? settings.values.lastSongId
          : "catalog:four",
      ),
    };
  }),
);
