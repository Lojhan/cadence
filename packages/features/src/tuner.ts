import { TunerMicrophone } from "@cadence/audio-browser";
import {
  centsDifference,
  findClosestString,
  getTuningPreset,
  isEmergencyBreakRisk,
  tuningDirection,
} from "@cadence/music";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTunerOptions {
  tuningId: string;
  autoDetectString?: boolean;
  deviceId?: string;
  boostDb?: number;
}

export function useTuner({
  tuningId,
  autoDetectString = false,
  deviceId = "",
  boostDb = 0,
}: UseTunerOptions) {
  const preset = getTuningPreset(tuningId);

  const [selectedStringIndex, setSelectedStringIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detectedHz, setDetectedHz] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [chromaticCents, setChromaticCents] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [direction, setDirection] = useState<
    "up" | "down" | "in_tune" | "idle"
  >("idle");
  const [emergencyBreakRisk, setEmergencyBreakRisk] = useState(false);
  const [playingReference, setPlayingReference] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneRef = useRef<TunerMicrophone | null>(null);
  const selectedIndexRef = useRef(selectedStringIndex);
  selectedIndexRef.current = selectedStringIndex;
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const referenceOscRef = useRef<OscillatorNode | null>(null);
  const isListeningRef = useRef(false);
  const autoDetectRef = useRef(autoDetectString);
  autoDetectRef.current = autoDetectString;

  const targetString = preset.strings[selectedStringIndex] ?? preset.strings[0];

  // Stop reference tone helper
  const stopReferenceTone = useCallback(() => {
    if (referenceOscRef.current) {
      try {
        referenceOscRef.current.stop();
        referenceOscRef.current.disconnect();
      } catch {
        // ignore
      }
      referenceOscRef.current = null;
    }
    setPlayingReference(false);
  }, []);

  // Play reference plucked tone helper
  const playReferenceTone = useCallback(
    (hz: number) => {
      stopReferenceTone();
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = audioContextRef.current || new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(hz, ctx.currentTime);

        // Natural pluck envelope: quick attack (5ms), exponential decay (2s)
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.25);
        referenceOscRef.current = osc;
        setPlayingReference(true);

        osc.onended = () => {
          if (referenceOscRef.current === osc) {
            referenceOscRef.current = null;
            setPlayingReference(false);
          }
        };
      } catch (err) {
        console.warn("Reference tone error", err);
        setPlayingReference(false);
      }
    },
    [stopReferenceTone],
  );

  const stopTuning = useCallback(() => {
    isListeningRef.current = false;
    microphoneRef.current?.dispose();
    microphoneRef.current = null;
    stopReferenceTone();
    setListening(false);
    setDetectedHz(null);
    setCents(null);
    setChromaticCents(null);
    setDetectedNote(null);
    setDirection("idle");
    setEmergencyBreakRisk(false);
  }, [stopReferenceTone]);

  const startTuning = useCallback(async () => {
    stopTuning();
    setBusy(true);
    setError(null);
    const microphone = new TunerMicrophone((event) => {
      if (microphoneRef.current !== microphone || !isListeningRef.current)
        return;
      if (event.type === "error") {
        setError(event.message);
        stopTuning();
        return;
      }
      if (event.frequency === null) {
        setDetectedHz(null);
        setCents(null);
        setChromaticCents(null);
        setDetectedNote(null);
        setDirection("idle");
        setEmergencyBreakRisk(false);
        return;
      }
      const detected = event.frequency;
      setDetectedHz(detected);
      const midi = Math.round(69 + 12 * Math.log2(detected / 440));
      const notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
      ];
      setDetectedNote(
        `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`,
      );
      setChromaticCents(
        centsDifference(detected, 440 * 2 ** ((midi - 69) / 12)),
      );
      const currentPreset = presetRef.current;
      let activeIndex = selectedIndexRef.current;
      if (autoDetectRef.current) {
        activeIndex = findClosestString(detected, currentPreset).stringIndex;
        selectedIndexRef.current = activeIndex;
        setSelectedStringIndex(activeIndex);
      }
      const currentTarget =
        currentPreset.strings[activeIndex] ?? currentPreset.strings[0];
      const diffCents = centsDifference(detected, currentTarget.targetHz);
      setCents(diffCents);
      setDirection(tuningDirection(diffCents, 3));
      // Only a confirmed pitch near the selected string can raise a tension warning.
      // Different strings and octave harmonics must not flash a warning.
      setEmergencyBreakRisk(
        diffCents > 0 &&
          diffCents < 300 &&
          isEmergencyBreakRisk(diffCents, activeIndex),
      );
    });
    microphoneRef.current = microphone;
    try {
      await microphone.start(deviceId, boostDb);
      if (microphoneRef.current !== microphone) return;
      isListeningRef.current = true;
      setListening(true);
    } catch (err) {
      if (microphoneRef.current !== microphone) return;
      setError(
        err instanceof Error ? err.message : "Failed to access microphone",
      );
      stopTuning();
    } finally {
      if (microphoneRef.current === microphone || !microphoneRef.current)
        setBusy(false);
    }
  }, [deviceId, boostDb, stopTuning]);

  useEffect(() => {
    // A target change invalidates the prior string-relative reading immediately.
    setCents(null);
    setDirection("idle");
    setEmergencyBreakRisk(false);
  }, [tuningId, selectedStringIndex]);

  useEffect(() => {
    return () => {
      stopTuning();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stopTuning]);

  return {
    preset,
    selectedStringIndex,
    setSelectedStringIndex,
    targetString,
    listening,
    busy,
    detectedHz,
    cents,
    chromaticCents,
    detectedNote,
    direction,
    emergencyBreakRisk,
    playingReference,
    error,
    startTuning,
    stopTuning,
    playReferenceTone: () => playReferenceTone(targetString.targetHz),
    stopReferenceTone,
  };
}
