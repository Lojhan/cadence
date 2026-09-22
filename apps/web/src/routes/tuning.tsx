import { TuningPage } from "@cadence/features";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import * as functions from "../functions/cadence.functions";
import { gateway } from "../lib/gateway.ts";

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

  const initialPreferences = initial?.preferences ?? {
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
  };

  return (
    <TuningPage
      gateway={gateway}
      initialPreferences={initialPreferences}
      initialTuningId={preset}
      onBack={() => void navigate({ to: "/" })}
    />
  );
}
