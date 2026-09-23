import {
  CadenceError,
  type CadenceGateway,
  type Preferences,
  type StoredPreferences,
} from "@cadence/contracts";

export type PreferenceWriteStatus = "idle" | "saving" | "saved" | "error";
export type PreferenceWriteState = {
  values: Preferences;
  status: PreferenceWriteStatus;
  error: string;
  dirty: boolean;
};

function equalPreference(
  key: keyof Preferences,
  left: Preferences[keyof Preferences] | undefined,
  right: Preferences[keyof Preferences] | undefined,
): boolean {
  if (key !== "voicings") return Object.is(left, right);
  const a = left as Preferences["voicings"] | undefined;
  const b = right as Preferences["voicings"] | undefined;
  if (!a || !b) return a === b;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((name) => a[name] === b[name])
  );
}

export function createPreferenceWriter(
  gateway: Pick<CadenceGateway, "preferences" | "savePreferences">,
  initial: StoredPreferences,
  onChange: (state: PreferenceWriteState) => void,
  options: { retainOnError?: boolean; autoRebase?: boolean } = {},
) {
  let persisted = initial;
  let intent: Partial<Preferences> = {};
  let active: Promise<boolean> | null = null;
  let disposed = false;
  let state: PreferenceWriteState = {
    values: initial.values,
    status: "idle",
    error: "",
    dirty: false,
  };

  const pending = () =>
    (Object.keys(intent) as (keyof Preferences)[]).some(
      (key) => !equalPreference(key, intent[key], persisted.values[key]),
    );
  const emit = (status: PreferenceWriteStatus, error = "") => {
    state = {
      values: { ...persisted.values, ...intent },
      status,
      error,
      dirty: pending(),
    };
    if (!disposed) onChange(state);
  };

  async function drain(): Promise<boolean> {
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
          options.autoRebase &&
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
            // Keep the last confirmed state when refresh fails.
          }
        }
        if (options.retainOnError === false) intent = {};
        emit(
          "error",
          error instanceof Error ? error.message : "Could not save settings",
        );
        return false;
      }
      conflicts = 0;
      persisted = next;
      for (const key of Object.keys(sent) as (keyof Preferences)[]) {
        if (
          equalPreference(key, intent[key], sent[key]) &&
          equalPreference(key, intent[key], next.values[key])
        )
          delete intent[key];
      }
      emit(pending() ? "saving" : "saved");
    }
    return true;
  }

  function start(): Promise<boolean> {
    if (active) return active;
    const write = drain().finally(() => {
      if (active === write) active = null;
    });
    active = write;
    return write;
  }

  return {
    getState: () => state,
    update(patch: Partial<Preferences>): Promise<boolean> {
      intent = { ...intent, ...patch };
      emit(pending() ? "saving" : "saved");
      return pending() ? start() : Promise.resolve(true);
    },
    retry(): Promise<boolean> {
      if (!pending()) return Promise.resolve(true);
      emit("saving");
      return start();
    },
    async discard(): Promise<boolean> {
      if (active) await active;
      try {
        persisted = await gateway.preferences();
        intent = {};
        emit("saved");
        return true;
      } catch (error) {
        emit(
          "error",
          error instanceof Error ? error.message : "Could not load settings",
        );
        return false;
      }
    },
    dispose() {
      disposed = true;
    },
  };
}
