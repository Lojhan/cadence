import { Metronome } from "@cadence/audio-browser";
import { Button, DockButtonMenu, Field, Input, Select } from "@cadence/ui";
import { Check, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MetronomeControls({ enabled }: { enabled: boolean }) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const startRequest = useRef(0);
  const [metronome] = useState(
    () =>
      new Metronome(undefined, undefined, undefined, () => setRunning(false)),
  );
  const [bpm, setBpm] = useState(100);
  const [beats, setBeats] = useState(4);
  const [accent, setAccent] = useState(true);
  const [volume, setVolume] = useState(70);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      startRequest.current++;
      metronome.stop();
      setStarting(false);
    }
  }, [enabled, metronome]);
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) metronome.stop();
    };
    const stopOnLeave = () => metronome.stop();
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopOnLeave);
    return () => {
      startRequest.current++;
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopOnLeave);
      metronome.stop();
    };
  }, [metronome]);

  async function start(nextBpm = bpm, nextBeats = beats, nextAccent = accent) {
    const request = ++startRequest.current;
    setError("");
    setStarting(true);
    try {
      await metronome.start(nextBpm, nextBeats, nextAccent, volume);
      if (request !== startRequest.current) return;
      setRunning(metronome.running);
    } catch (cause) {
      if (request !== startRequest.current) return;
      setRunning(metronome.running);
      setError(
        cause instanceof Error ? cause.message : "Audio output is unavailable.",
      );
    } finally {
      if (request === startRequest.current) setStarting(false);
    }
  }

  function change(nextBpm: number, nextBeats: number, nextAccent: boolean) {
    setBpm(nextBpm);
    setBeats(nextBeats);
    setAccent(nextAccent);
    if (metronome.running) void start(nextBpm, nextBeats, nextAccent);
  }

  return (
    <DockButtonMenu
      label={
        running ? "Metronome running, open controls" : "Open metronome controls"
      }
      icon={<Timer aria-hidden="true" />}
      className={running ? "!bg-foreground !text-background" : ""}
    >
      <div className="grid gap-2 p-2 text-foreground">
        <strong className="text-sm">Metronome</strong>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tempo (BPM)" htmlFor="metronome-bpm" className="!my-1">
            <Input
              id="metronome-bpm"
              type="number"
              min={40}
              max={240}
              step={1}
              value={bpm}
              onChange={(event) =>
                change(Number(event.target.value), beats, accent)
              }
            />
          </Field>
          <Field label="Beats" htmlFor="metronome-beats" className="!my-1">
            <Select
              id="metronome-beats"
              label="Beats per measure"
              value={beats}
              onChange={(event) =>
                change(bpm, Number(event.target.value), accent)
              }
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Volume" htmlFor="metronome-volume" className="!my-1">
          <span className="flex min-h-11 items-center gap-3">
            <input
              id="metronome-volume"
              type="range"
              min={10}
              max={100}
              step={10}
              value={volume}
              aria-valuetext={`${volume}%`}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                metronome.setVolume(next);
              }}
            />
            <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
              {volume}%
            </span>
          </span>
        </Field>
        <label className="!flex min-h-11 cursor-pointer items-center gap-3 rounded-xl text-sm transition-colors hover:bg-secondary">
          <span className="relative size-5 shrink-0">
            <input
              type="checkbox"
              className="m-0 block size-5 cursor-pointer appearance-none rounded-[6px] border border-border bg-background transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              checked={accent}
              onChange={(event) => change(bpm, beats, event.target.checked)}
            />
            {accent ? (
              <Check
                className="pointer-events-none absolute inset-0 size-5 p-[3px] text-primary-foreground"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span>Accent first beat</span>
        </label>
        <Button
          onClick={() => {
            if (metronome.running || starting) {
              startRequest.current++;
              metronome.stop();
              setStarting(false);
              setRunning(false);
            } else void start();
          }}
        >
          {starting
            ? "Cancel start"
            : running
              ? "Stop metronome"
              : "Start metronome"}
        </Button>
        {starting ? (
          <span role="status" className="text-xs text-muted-foreground">
            Starting audio…
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        ) : null}
        <small className="text-muted-foreground">
          Use headphones while the microphone listens so clicks do not reach it.
        </small>
      </div>
    </DockButtonMenu>
  );
}
