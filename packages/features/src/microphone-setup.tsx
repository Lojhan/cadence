import type { Profile } from "@cadence/audio-browser";
import { Button, Dialog, Select } from "@cadence/ui";
import { Check } from "lucide-react";
import { useState } from "react";
import { MicrophoneOptions } from "./microphone-options.tsx";
import { SoundCheck } from "./sound-check.tsx";

export function MicrophoneSetup({
  hand,
  device,
  devices,
  profile,
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
  saving: boolean;
  onHand: (hand: "left" | "right") => void;
  onDevice: (device: string) => void;
  onClose: () => void;
  onComplete: () => void;
  onAccess: () => void;
}) {
  const [readyInput, setReadyInput] = useState<string | null>(null);
  const input = `${device}:${profile}`;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Your guitar setup"
    >
      <div className="panel-body">
        <p>
          Choose your playing hand and microphone, then play a chord to check
          the sound.
        </p>
        <label className="field" htmlFor="setup-hand">
          <span>Playing hand</span>
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
        </label>
        <label className="field" htmlFor="setup-input">
          <span>Microphone input</span>
          <Select
            id="setup-input"
            label="Microphone input"
            value={device}
            onChange={(event) => onDevice(event.target.value)}
          >
            <MicrophoneOptions device={device} devices={devices} />
          </Select>
        </label>
        <SoundCheck
          key={input}
          device={device}
          profile={profile}
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
      </div>
    </Dialog>
  );
}
