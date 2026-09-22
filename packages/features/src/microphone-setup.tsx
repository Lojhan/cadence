import type { Profile } from "@cadence/audio-browser";
import { Button, Dialog, DialogBody, Field, Select } from "@cadence/ui";
import { Check } from "lucide-react";
import { useState } from "react";
import { MicrophoneOptions } from "./microphone-options.tsx";
import { SoundCheck } from "./sound-check.tsx";

export function MicrophoneSetup({
  hand,
  device,
  devices,
  profile,
  boostDb,
  onBoost,
  saving,
  onHand,
  onDevice,
  onClose,
  onComplete,
  onAccess,
}: {
  hand: "left" | "right";
  device: string;
  devices: MediaDeviceInfo[];
  profile: Profile;
  boostDb: number;
  onBoost: (value: number) => void;
  saving: boolean;
  onHand: (hand: "left" | "right") => void;
  onDevice: (device: string) => void;
  onClose: () => void;
  onComplete: () => void;
  onAccess: () => void;
}) {
  const [readyInput, setReadyInput] = useState<string | null>(null);
  const input = `${device}:${profile}:${boostDb}`;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Your guitar setup"
    >
      <DialogBody>
        <p>
          Choose your playing hand and microphone, then play a chord to check
          the sound.
        </p>
        <Field label="Playing hand" htmlFor="setup-hand">
          <Select
            id="setup-hand"
            label="Playing hand"
            value={hand}
            disabled={saving}
            onChange={(event) => onHand(event.target.value as "left" | "right")}
          >
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </Select>
        </Field>
        <Field label="Microphone input" htmlFor="setup-input">
          <Select
            id="setup-input"
            label="Microphone input"
            value={device}
            onChange={(event) => onDevice(event.target.value)}
          >
            <MicrophoneOptions device={device} devices={devices} />
          </Select>
        </Field>
        <SoundCheck
          key={input}
          device={device}
          profile={profile}
          boostDb={boostDb}
          onBoost={onBoost}
          onOpen={onAccess}
          onReady={(ready) => setReadyInput(ready ? input : null)}
        />
        <div className="actions">
          <Button
            className="primary"
            disabled={saving || readyInput !== input}
            onClick={onComplete}
          >
            <Check />
            Finish setup
          </Button>
        </div>
        <p className="note">
          You can change these choices in Setup. Closing this dialog leaves
          manual practice available.
        </p>
      </DialogBody>
    </Dialog>
  );
}
