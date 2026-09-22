const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isAllowedPersonalOrigin(
  requestUrl: string,
  configuredOrigin: string | undefined,
  development: boolean,
): boolean {
  const expected = new URL(configuredOrigin ?? "http://localhost:3000");
  const actual = new URL(requestUrl);
  if (actual.host === expected.host) return true;
  return (
    (development || configuredOrigin !== undefined) &&
    LOOPBACK_HOSTS.has(expected.hostname) &&
    actual.port === expected.port &&
    LOOPBACK_HOSTS.has(actual.hostname)
  );
}
