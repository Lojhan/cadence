import { strict as assert } from "poku";
import {
  defaultInputBoost,
  isApplePlatformOrSafari,
  readInputBoost,
} from "../../packages/features/src/microphone-options.tsx";

const originalNavigator = globalThis.navigator;
const originalLocalStorage = globalThis.localStorage;

function setMockEnvironment(
  userAgent: string,
  platform = "MacIntel",
  maxTouchPoints = 0,
) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent,
      platform,
      maxTouchPoints,
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
  return store;
}

try {
  // 1. iPhone Safari
  setMockEnvironment(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "iPhone",
    5,
  );
  assert.equal(
    isApplePlatformOrSafari(),
    true,
    "iPhone is detected as iOS/Safari",
  );
  assert.equal(defaultInputBoost(), 24, "iPhone defaults to 24 dB boost");
  assert.equal(
    readInputBoost("mic-1"),
    24,
    "Unset mic on iPhone reads 24 dB boost",
  );

  // 2. iPadOS (presents as MacIntel with touch points)
  setMockEnvironment(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "MacIntel",
    5,
  );
  assert.equal(
    isApplePlatformOrSafari(),
    true,
    "iPadOS is detected as iOS/Safari",
  );
  assert.equal(defaultInputBoost(), 24, "iPadOS defaults to 24 dB boost");

  // 3. Desktop macOS Safari
  setMockEnvironment(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "MacIntel",
    0,
  );
  assert.equal(isApplePlatformOrSafari(), true, "Desktop Safari is detected");
  assert.equal(
    defaultInputBoost(),
    24,
    "Desktop Safari defaults to 24 dB boost",
  );

  // 4. Desktop Chrome on macOS
  setMockEnvironment(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "MacIntel",
    0,
  );
  assert.equal(
    isApplePlatformOrSafari(),
    false,
    "Desktop Chrome is not treated as iOS/Safari",
  );
  assert.equal(
    defaultInputBoost(),
    0,
    "Desktop Chrome defaults to 0 dB boost (Off)",
  );
  assert.equal(
    readInputBoost("mic-1"),
    0,
    "Unset mic on Chrome reads 0 dB boost",
  );

  // 5. Explicit user preference overrides default
  const store = setMockEnvironment(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "iPhone",
    5,
  );
  store.set("cadence-input-boost:mic-1", "0");
  assert.equal(
    readInputBoost("mic-1"),
    0,
    "Explicit 0 dB override on iPhone is respected",
  );

  store.set("cadence-input-boost:mic-1", "12");
  assert.equal(
    readInputBoost("mic-1"),
    12,
    "Explicit 12 dB override on iPhone is respected",
  );

  // 6. Invalid stored value falls back to platform default
  store.set("cadence-input-boost:mic-1", "999");
  assert.equal(
    readInputBoost("mic-1"),
    24,
    "Invalid stored boost falls back to 24 dB on iPhone",
  );
} finally {
  if (originalNavigator) {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }
}
