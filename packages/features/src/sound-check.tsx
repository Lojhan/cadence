import type { Profile } from "@cadence/audio-browser";
import { Button } from "@cadence/ui";
import { Mic, MicOff } from "lucide-react";
import { useEffect } from "react";
import { useMicrophoneCheck } from "./microphone-check.ts";
import { InputBoost } from "./microphone-options.tsx";
export function SoundCheck({
  device,
  profile,
  boostDb,
  onBoost,
  onReady,
  onOpen,
}: {
  device: string;
  profile: Profile;
  boostDb: number;
  onBoost: (value: number) => void;
  onReady?: (ready: boolean) => void;
  onOpen?: () => void;
}) {
  const check = useMicrophoneCheck();
  useEffect(() => {
    onReady?.(check.heardSignal);
  }, [check.heardSignal, onReady]);
  async function toggle() {
    if (check.listening) {
      check.stop();
      return;
    }
    onReady?.(false);
    await check.start(device, profile, boostDb, onOpen);
  }
  return (
    <div className="sound-check pt-[22px] [&_meter]:my-4 [&_meter]:block [&_meter]:h-5 [&_meter]:w-full">
      <InputBoost value={boostDb} onChange={onBoost} />
      <p>Standard guitar tuning · A4 440 Hz</p>
      <Button disabled={check.busy} onClick={() => void toggle()}>
        {check.listening ? <MicOff /> : <Mic />}
        {check.listening ? "Stop sound check" : "Check microphone"}
      </Button>
      {check.listening ? (
        <>
          <meter
            min={0}
            max={0.3}
            value={check.level}
            aria-label="Microphone signal"
          />
          <p>
            {check.level > 0.25
              ? "Input is loud. Lower the boost if it distorts."
              : check.level < 0.008
                ? "Play a chord to check your input."
                : "Your microphone is receiving sound."}
          </p>
        </>
      ) : null}
      {check.error ? <p role="alert">{check.error}</p> : null}
    </div>
  );
}
