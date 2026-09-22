import {
  centsDifference,
  findClosestString,
  getTuningPreset,
  isEmergencyBreakRisk,
  tuningDirection,
} from "@cadence/music";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Time-domain autocorrelation pitch detection with parabolic interpolation.
 * Detects fundamental frequency within minFreq..maxFreq (default 60..500 Hz, covering 6-string guitar).
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
  minFreq = 60,
  maxFreq = 500,
): { frequency: number; confidence: number } | null {
  // Check RMS energy to reject silence/noise
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i] ?? 0;
    sumSquares += val * val;
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  if (rms < 0.006) return null;

  const minPeriod = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxPeriod = Math.min(
    buffer.length - 2,
    Math.floor(sampleRate / minFreq),
  );

  const nsdf = new Float32Array(maxPeriod + 2);

  for (let period = minPeriod - 1; period <= maxPeriod + 1; period++) {
    let sumProd = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    const len = buffer.length - period;
    for (let i = 0; i < len; i++) {
      const x1 = buffer[i] ?? 0;
      const x2 = buffer[i + period] ?? 0;
      sumProd += x1 * x2;
      sumSq1 += x1 * x1;
      sumSq2 += x2 * x2;
    }
    const denom = sumSq1 + sumSq2;
    nsdf[period] = denom > 1e-6 ? (2 * sumProd) / denom : 0;
  }

  // Find global maximum across all periods
  let globalMax = -Infinity;
  for (let period = minPeriod; period <= maxPeriod; period++) {
    const val = nsdf[period] ?? 0;
    if (val > globalMax) {
      globalMax = val;
    }
  }

  if (globalMax < 0.35) return null;

  // Find local maxima and pick the FIRST peak that reaches 0.85 * globalMax
  const cutoff = 0.85 * globalMax;
  let bestPeriod = -1;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    const prev = nsdf[period - 1] ?? 0;
    const curr = nsdf[period] ?? 0;
    const next = nsdf[period + 1] ?? 0;

    if (curr > prev && curr >= next && curr >= cutoff) {
      bestPeriod = period;
      break;
    }
  }

  if (bestPeriod <= 0) return null;

  // Parabolic interpolation for sub-sample peak resolution
  let periodSub = bestPeriod;
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const prev = nsdf[bestPeriod - 1] ?? 0;
    const curr = nsdf[bestPeriod] ?? 0;
    const next = nsdf[bestPeriod + 1] ?? 0;

    const denominator = 2 * (2 * curr - prev - next);
    if (Math.abs(denominator) > 1e-6) {
      const delta = (next - prev) / denominator;
      if (Math.abs(delta) < 1) {
        periodSub += delta;
      }
    }
  }

  const frequency = sampleRate / periodSub;
  if (frequency < minFreq || frequency > maxFreq) return null;

  return {
    frequency,
    confidence: globalMax,
  };
}

export interface UseTunerOptions {
  tuningId: string;
  autoDetectString?: boolean;
}

export function useTuner({
  tuningId,
  autoDetectString = false,
}: UseTunerOptions) {
  const preset = getTuningPreset(tuningId);

  const [selectedStringIndex, setSelectedStringIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [detectedHz, setDetectedHz] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [direction, setDirection] = useState<
    "up" | "down" | "in_tune" | "idle"
  >("idle");
  const [emergencyBreakRisk, setEmergencyBreakRisk] = useState(false);
  const [playingReference, setPlayingReference] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const referenceOscRef = useRef<OscillatorNode | null>(null);
  const isListeningRef = useRef(false);

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

  // Stop tuning / mic capture
  const stopTuning = useCallback(() => {
    isListeningRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    stopReferenceTone();
    setListening(false);
    setDetectedHz(null);
    setCents(null);
    setDirection("idle");
    setEmergencyBreakRisk(false);
  }, [stopReferenceTone]);

  // Start tuning / mic capture
  const startTuning = useCallback(async () => {
    stopTuning();
    setError(null);

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Microphone capture is not supported in this environment",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      isListeningRef.current = true;
      setListening(true);

      const buffer = new Float32Array(analyser.fftSize);

      const processAudio = () => {
        if (!isListeningRef.current) return;

        analyser.getFloatTimeDomainData(buffer);
        const pitch = detectPitchAutocorrelation(buffer, ctx.sampleRate);

        if (pitch && pitch.frequency > 50 && pitch.frequency < 480) {
          const detected = pitch.frequency;
          setDetectedHz(detected);

          let activeIndex = selectedStringIndex;
          if (autoDetectString) {
            const closest = findClosestString(detected, preset);
            activeIndex = closest.stringIndex;
            setSelectedStringIndex(activeIndex);
          }

          const currentTarget =
            preset.strings[activeIndex] ?? preset.strings[0];
          const diffCents = centsDifference(detected, currentTarget.targetHz);
          setCents(diffCents);

          const dir = tuningDirection(diffCents, 3);
          setDirection(dir);

          const isDanger = isEmergencyBreakRisk(diffCents, activeIndex);
          setEmergencyBreakRisk(isDanger);
        }

        animFrameRef.current = requestAnimationFrame(processAudio);
      };

      animFrameRef.current = requestAnimationFrame(processAudio);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone",
      );
      stopTuning();
    }
  }, [preset, selectedStringIndex, autoDetectString, stopTuning]);

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
    detectedHz,
    cents,
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
