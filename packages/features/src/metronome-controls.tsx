import { Metronome } from "@cadence/audio-browser";
import { Button, DockButtonMenu, Field, Input, Select } from "@cadence/ui";
import { Check, Timer } from "lucide-react";
import { useEffect, useState } from "react";

export function MetronomeControls({ enabled }: { enabled: boolean }) {
  const [running, setRunning] = useState(false);
  const [metronome] = useState(
    () =>
      new Metronome(undefined, undefined, undefined, () => setRunning(false)),
  );
  const [bpm, setBpm] = useState(100);
  const [beats, setBeats] = useState(4);
  const [accent, setAccent] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) metronome.stop();
  }, [enabled, metronome]);
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) metronome.stop();
    };
    const stopOnLeave = () => metronome.stop();
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopOnLeave);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopOnLeave);
      metronome.stop();
    };
  }, [metronome]);

  async function start() {
    setError("");
    try {
      await metronome.start(bpm, beats, accent);
      setRunning(metronome.running);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Audio output is unavailable.",
      );
    }
  }

  function change(nextBpm: number, nextBeats: number, nextAccent: boolean) {
    setBpm(nextBpm);
    setBeats(nextBeats);
    setAccent(nextAccent);
    if (running) {
      void metronome.start(nextBpm, nextBeats, nextAccent).then(
        () => setRunning(metronome.running),
        (cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "Audio output is unavailable.",
          ),
      );
    }
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
        <Field
          label="Beats per measure"
          htmlFor="metronome-beats"
          className="!my-1"
        >
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
            if (running) metronome.stop();
            else void start();
          }}
        >
          {running ? "Stop metronome" : "Start metronome"}
        </Button>
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
