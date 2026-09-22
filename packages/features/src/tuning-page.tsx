import type { CadenceGateway, StoredPreferences } from "@cadence/contracts";
import { TUNING_PRESETS } from "@cadence/music";
import { Button, TunerFretboard, TunerGauge, TuningSelect } from "@cadence/ui";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { useState } from "react";
import { useTuner } from "./tuner.ts";

export function TuningPage({
  gateway,
  initialPreferences,
  onBack,
}: {
  gateway: CadenceGateway;
  initialPreferences: StoredPreferences;
  onBack?: () => void;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [selectedTuning, setSelectedTuning] = useState(
    initialPreferences.values.tuning || "standard",
  );
  const [saveStatus, setSaveStatus] = useState<string>("");

  const tuner = useTuner({
    tuningId: selectedTuning,
  });

  // Whenever selected tuning changes, automatically save to gateway preferences!
  const handleTuningChange = async (newTuningId: string) => {
    setSelectedTuning(newTuningId);
    setSaveStatus("Saving...");
    try {
      const next = await gateway.savePreferences({
        revision: preferences.revision,
        values: {
          ...preferences.values,
          tuning: newTuningId,
        },
      });
      setPreferences(next);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      console.error("Failed to auto-save tuning preference", err);
      setSaveStatus("Failed to save");
    }
  };

  return (
    <main className="tuner-page">
      <header className="tuner-header">
        <div className="tuner-header-top">
          {onBack ? (
            <Button className="tuner-back-btn" onClick={onBack}>
              <ArrowLeft />
              <span>Back to Practice</span>
            </Button>
          ) : (
            <a href="/" className="pill tuner-back-btn">
              <ArrowLeft />
              <span>Back to Practice</span>
            </a>
          )}
          {saveStatus && (
            <span className="tuner-save-status" role="status">
              {saveStatus}
            </span>
          )}
        </div>
        <div className="tuner-title-row">
          <h1>Guitar Tuner</h1>
          <div className="tuner-top-controls">
            <TuningSelect
              presets={TUNING_PRESETS}
              value={selectedTuning}
              onChange={(id) => void handleTuningChange(id)}
            />
            <Button
              className={`tuner-listen-toggle ${tuner.listening ? "primary" : ""}`}
              onClick={() => {
                if (tuner.listening) {
                  tuner.stopTuning();
                } else {
                  void tuner.startTuning();
                }
              }}
            >
              {tuner.listening ? <MicOff /> : <Mic />}
              <span>{tuner.listening ? "Stop Mic" : "Start Tuning"}</span>
            </Button>
          </div>
        </div>
      </header>

      {tuner.error && (
        <div className="toast" role="alert">
          <span>{tuner.error}</span>
        </div>
      )}

      {/* Middle stage: expanded string gauge & guidance */}
      <TunerGauge
        string={tuner.targetString}
        detectedHz={tuner.detectedHz}
        cents={tuner.cents}
        direction={tuner.direction}
        emergencyBreakRisk={tuner.emergencyBreakRisk}
        onPlayReference={tuner.playReferenceTone}
        playingReference={tuner.playingReference}
      />

      {/* Bottom stage: interactive fretboard with 6 strings */}
      <TunerFretboard
        strings={tuner.preset.strings}
        selectedStringIndex={tuner.selectedStringIndex}
        onSelectString={(idx) => tuner.setSelectedStringIndex(idx)}
        hand={preferences.values.hand}
      />
    </main>
  );
}
