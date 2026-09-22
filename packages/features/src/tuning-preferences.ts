import {
  CadenceError,
  type CadenceGateway,
  type Preferences,
  type StoredPreferences,
} from "@cadence/contracts";

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
  let persisted = initial;
  let intent: EditablePreferences = {};
  let active: Promise<void> | null = null;
  let disposed = false;

  const values = () => ({ ...persisted.values, ...intent });
  const pending = () =>
    (intent.tuning !== undefined &&
      intent.tuning !== persisted.values.tuning) ||
    (intent.theme !== undefined && intent.theme !== persisted.values.theme);
  const emit = (status: TuningPreferenceStatus) => {
    if (!disposed) onChange({ values: values(), status });
  };

  async function drain() {
    let conflicts = 0;
    while (pending() && !disposed) {
      const sent = { ...intent };
      let next: StoredPreferences;
      try {
        next = await gateway.savePreferences({
          revision: persisted.revision,
          values: { ...persisted.values, ...sent },
        });
      } catch (error) {
        if (
          error instanceof CadenceError &&
          error.code === "CONFLICT" &&
          conflicts < 2
        ) {
          conflicts++;
          try {
            persisted = await gateway.preferences();
            emit("saving");
            continue;
          } catch {
            // Revert to the last confirmed values if refresh also fails.
          }
        }
        intent = {};
        emit("error");
        return;
      }
      conflicts = 0;
      persisted = next;
      if (intent.tuning === sent.tuning && intent.tuning === next.values.tuning)
        delete intent.tuning;
      if (intent.theme === sent.theme && intent.theme === next.values.theme)
        delete intent.theme;
      emit(pending() ? "saving" : "saved");
    }
  }

  function start(): Promise<void> {
    if (active) return active;
    active = drain().finally(() => {
      active = null;
      if (pending() && !disposed) void start();
    });
    return active;
  }

  return {
    update(patch: EditablePreferences): Promise<void> {
      intent = { ...intent, ...patch };
      emit(pending() ? "saving" : "saved");
      return start();
    },
    dispose() {
      disposed = true;
    },
  };
}
