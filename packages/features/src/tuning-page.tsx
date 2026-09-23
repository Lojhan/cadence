import type { CadenceGateway, StoredPreferences } from "@cadence/contracts";
import { getTuningPreset, TUNING_PRESETS } from "@cadence/music";
import { TunerExperience } from "@cadence/ui";
import { useEffect, useMemo, useState } from "react";
import { readInputBoost } from "./microphone-options.tsx";
import { useTuner } from "./tuner.ts";
import { createTuningPreferenceWriter } from "./tuning-preferences.ts";

export function TuningPage({
  gateway,
  initialPreferences,
  initialTuningId,
  onBack,
}: {
  gateway: CadenceGateway;
  initialPreferences: StoredPreferences;
  initialTuningId?: string | undefined;
  onBack?: () => void;
}) {
  const [preferences, setPreferences] = useState(initialPreferences.values);
  const [selectedTuning, setSelectedTuning] = useState(
    () =>
      getTuningPreset(initialTuningId ?? initialPreferences.values.tuning).id,
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [mode, setMode] = useState<"strings" | "chromatic">("strings");
  const [autoDetectString, setAutoDetectString] = useState(true);
  const [device, setDevice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [boostDb, setBoostDb] = useState(0);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    initialPreferences.values.theme === "dark" ? "dark" : "light",
  );
  const writer = useMemo(
    () =>
      createTuningPreferenceWriter(gateway, initialPreferences, (state) => {
        setPreferences(state.values);
        if (state.status === "error") setSelectedTuning(state.values.tuning);
        setSaveStatus(
          state.status === "saving"
            ? "Saving…"
            : state.status === "saved"
              ? "Saved"
              : "Could not save preference",
        );
      }),
    [gateway, initialPreferences],
  );
  useEffect(() => () => writer.dispose(), [writer]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cadence-device") ?? "";
      setDevice(saved);
      setBoostDb(readInputBoost(saved));
    } catch {}
    const refresh = () => {
      void navigator.mediaDevices
        ?.enumerateDevices()
        .then((all) =>
          setDevices(all.filter((item) => item.kind === "audioinput")),
        )
        .catch(() => {});
    };
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, []);
  useEffect(() => {
    setSelectedTuning(
      getTuningPreset(initialTuningId ?? initialPreferences.values.tuning).id,
    );
  }, [initialTuningId, initialPreferences.values.tuning]);
  useEffect(() => {
    if (saveStatus !== "Saved") return;
    const timer = setTimeout(() => setSaveStatus(""), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        preferences.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
      document.documentElement.dataset.theme = resolved;
      setResolvedTheme(resolved);
      try {
        localStorage.setItem("cadence-theme", preferences.theme);
      } catch {}
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);

  const tuner = useTuner({
    tuningId: selectedTuning,
    autoDetectString,
    deviceId: device,
    boostDb,
  });
  const toggleTheme = () => {
    const theme = resolvedTheme === "dark" ? "light" : "dark";
    void writer.update({ theme });
  };

  return (
    <TunerExperience
      presets={TUNING_PRESETS}
      value={selectedTuning}
      onPresetChange={(tuning) => {
        setSelectedTuning(tuning);
        void writer.update({ tuning });
      }}
      strings={tuner.preset.strings}
      selectedStringIndex={tuner.selectedStringIndex}
      onSelectString={(index) => {
        setAutoDetectString(false);
        tuner.setSelectedStringIndex(index);
      }}
      autoDetectString={autoDetectString}
      onAutoDetectStringChange={setAutoDetectString}
      inputDevice={device}
      inputDevices={devices}
      onInputDeviceChange={(next) => {
        tuner.stopTuning();
        setDevice(next);
        setBoostDb(readInputBoost(next));
        try {
          localStorage.setItem("cadence-device", next);
        } catch {}
      }}
      inputBoost={boostDb}
      onInputBoostChange={(next) => {
        tuner.stopTuning();
        setBoostDb(next);
        try {
          localStorage.setItem(`cadence-input-boost:${device}`, String(next));
        } catch {}
      }}
      mode={mode}
      onModeChange={setMode}
      detectedHz={tuner.detectedHz}
      detectedNote={tuner.detectedNote}
      chromaticCents={tuner.chromaticCents}
      cents={mode === "chromatic" ? tuner.chromaticCents : tuner.cents}
      direction={tuner.direction}
      emergencyBreakRisk={tuner.emergencyBreakRisk}
      listening={tuner.listening}
      busy={tuner.busy}
      onToggleListening={() => {
        if (tuner.listening) tuner.stopTuning();
        else
          void tuner.startTuning().then(() =>
            navigator.mediaDevices
              ?.enumerateDevices()
              .then((all) =>
                setDevices(all.filter((item) => item.kind === "audioinput")),
              )
              .catch(() => {}),
          );
      }}
      onBack={onBack ?? (() => window.location.assign("/"))}
      theme={resolvedTheme}
      onToggleTheme={toggleTheme}
      onPlayReference={tuner.playReferenceTone}
      playingReference={tuner.playingReference}
      saveStatus={saveStatus}
      error={tuner.error}
    />
  );
}
