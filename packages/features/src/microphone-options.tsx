import { Field, Select } from "@cadence/ui";
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
    <Field
      label="Input boost"
      htmlFor={id}
      hint="For a quiet microphone. Raise gradually, then check your sound. Saved only for this input on this browser."
    >
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
    </Field>
  );
}
export function isApplePlatformOrSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Android/.test(ua);
  return isIOS || isSafari;
}

export function defaultInputBoost(): number {
  return isApplePlatformOrSafari() ? 24 : 0;
}

export function readInputBoost(device: string): number {
  try {
    const raw = localStorage.getItem(`cadence-input-boost:${device}`);
    if (raw !== null) {
      const value = Number(raw);
      if ([0, 6, 12, 18, 24, 30].includes(value)) {
        return value;
      }
    }
    return defaultInputBoost();
  } catch {
    return defaultInputBoost();
  }
}
