import type {
  CadenceGateway,
  Preferences,
  StoredPreferences,
} from "@cadence/contracts";
import { createPreferenceWriter } from "./preference-writes.ts";

type EditablePreferences = Partial<Pick<Preferences, "tuning" | "theme">>;
export type TuningPreferenceStatus = "saving" | "saved" | "error";
export interface TuningPreferenceState {
  values: Preferences;
  status: TuningPreferenceStatus;
}

export function createTuningPreferenceWriter(
  gateway: Pick<CadenceGateway, "preferences" | "savePreferences">,
  initial: StoredPreferences,
  onChange: (state: TuningPreferenceState) => void,
) {
  const writer = createPreferenceWriter(
    gateway,
    initial,
    (state) => {
      if (state.status !== "idle")
        onChange({ values: state.values, status: state.status });
    },
    { retainOnError: false, autoRebase: true },
  );
  return {
    update: (patch: EditablePreferences) => writer.update(patch),
    dispose: () => writer.dispose(),
  };
}
