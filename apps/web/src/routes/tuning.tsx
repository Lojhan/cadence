import type { CadenceGateway } from "@cadence/contracts";
import { archiveSchema } from "@cadence/contracts";
import { TuningPage } from "@cadence/features";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import * as functions from "../functions/cadence.functions";

const gateway: CadenceGateway = {
  library: () => functions.library(),
  preferences: () => functions.preferences(),
  savePreferences: (data) => functions.savePreferences({ data }),
  saveSong: (data) => functions.saveSong({ data }),
  deleteSong: (id, revision) =>
    functions.deleteSong({ data: { id, revision } }),
  position: (data) => functions.position({ data }),
  savePosition: (data) => functions.savePosition({ data }),
  exportData: () => functions.exportData(),
  importData: (data) =>
    functions.importData({ data: archiveSchema.parse(data) }),
};

const tuningSearchSchema = z.object({
  preset: z.string().optional(),
});

export const Route = createFileRoute("/tuning")({
  validateSearch: (search) => tuningSearchSchema.parse(search),
  loader: () => functions.bootstrap(),
  component: TuningRoute,
});

function TuningRoute() {
  const navigate = useNavigate();
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const preset = (search as { preset?: string }).preset;

  const initialPreferences =
    preset && initial?.preferences
      ? {
          ...initial.preferences,
          values: {
            ...initial.preferences.values,
            tuning: preset,
          },
        }
      : (initial?.preferences ?? {
          values: {
            hand: "right" as const,
            theme: "system" as const,
            numbers: true,
            profile: "balanced" as const,
            loop: true,
            lastSongId: "catalog:four",
            diagramSize: "standard" as const,
            voicings: {},
            tuning: "standard",
          },
          revision: 1,
        });

  return (
    <TuningPage
      gateway={gateway}
      initialPreferences={initialPreferences}
      onBack={() => void navigate({ to: "/" })}
    />
  );
}
