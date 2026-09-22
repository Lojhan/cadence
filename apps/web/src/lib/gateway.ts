import { archiveSchema, type CadenceGateway } from "@cadence/contracts";
import * as functions from "../functions/cadence.functions";

export const gateway: CadenceGateway = {
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
