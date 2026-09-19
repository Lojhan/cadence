import type { CadenceGateway } from "@cadence/contracts";
import { archiveSchema } from "@cadence/contracts";
import { PracticeApp } from "@cadence/features";
import { createFileRoute } from "@tanstack/react-router";
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
export const Route = createFileRoute("/")({
  loader: () => functions.bootstrap(),
  component: Home,
});
function Home() {
  return <PracticeApp gateway={gateway} initial={Route.useLoaderData()} />;
}
