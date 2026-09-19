import { Microphone, type Profile } from "@cadence/audio-browser";
import { Button } from "@cadence/ui";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
export function SoundCheck({
  device,
  profile,
}: {
  device: string;
  profile: Profile;
}) {
  const microphone = useRef<Microphone | null>(null);
  const active = useRef(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      microphone.current?.dispose();
      microphone.current = null;
    };
  }, []);
  async function toggle() {
    if (listening) {
      microphone.current?.dispose();
      microphone.current = null;
      setListening(false);
      setLevel(0);
      return;
    }
    setBusy(true);
    setError("");
    const input = new Microphone((event) => {
      if (!active.current || microphone.current !== input) return;
      if (event.type === "metrics") setLevel(event.level);
      if (event.type === "error") {
        input.dispose();
        microphone.current = null;
        setLevel(0);
        setError(event.message);
        setListening(false);
      }
    });
    microphone.current = input;
    try {
      await input.open(device, profile);
      if (!active.current || microphone.current !== input) return;
      await input.unmute({ sessionId: "sound-check", epoch: 1, mask: 145 });
      if (active.current && microphone.current === input) setListening(true);
    } catch (error) {
      input.dispose();
      if (microphone.current === input) microphone.current = null;
      if (active.current)
        setError(
          error instanceof Error ? error.message : "Microphone unavailable",
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className="sound-check">
      <p>Standard guitar tuning · A4 440 Hz</p>
      <Button disabled={busy} onClick={() => void toggle()}>
        {listening ? <MicOff /> : <Mic />}
        {listening ? "Stop sound check" : "Check microphone"}
      </Button>
      {listening ? (
        <>
          <meter
            min={0}
            max={0.3}
            value={level}
            aria-label="Microphone signal"
          />
          <p>
            {level < 0.008
              ? "Play a chord to check your input."
              : "Your microphone is receiving sound."}
          </p>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
