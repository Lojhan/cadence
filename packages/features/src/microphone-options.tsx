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
