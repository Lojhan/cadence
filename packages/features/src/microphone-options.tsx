import { Select } from "@cadence/ui";
import { useId } from "react";
export function MicrophoneOptions({
  device,
  devices,
}: {
  device: string;
  devices: Pick<MediaDeviceInfo, "deviceId" | "label">[];
}) {
  return (
    <>
      <option value="">System default</option>
      {device && !devices.some((input) => input.deviceId === device) ? (
        <option value={device} disabled>
          Saved microphone unavailable
        </option>
      ) : null}
      {devices
        .filter((input) => input.deviceId)
        .map((input) => (
          <option value={input.deviceId} key={input.deviceId}>
            {input.label || "Microphone"}
          </option>
        ))}
    </>
  );
}

export function InputBoost({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>Input boost</span>
      <Select
        id={id}
        label="Input boost"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {[0, 6, 12, 18, 24, 30].map((db) => (
          <option key={db} value={db}>
            {db === 0 ? "Off" : `+${db} dB`}
          </option>
        ))}
      </Select>
      <span className="note">
        For a quiet microphone. Raise gradually, then check your sound. Saved
        only for this input on this browser.
      </span>
    </label>
  );
}
export function readInputBoost(device: string): number {
  try {
    const value = Number(localStorage.getItem(`cadence-input-boost:${device}`));
    return [0, 6, 12, 18, 24, 30].includes(value) ? value : 0;
  } catch {
    return 0;
  }
}
