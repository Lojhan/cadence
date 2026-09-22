import { strict as assert } from "poku";
import { isAllowedPersonalOrigin } from "../../apps/web/src/server/personal-origin.ts";

assert.equal(
  isAllowedPersonalOrigin("http://localhost:3000/", undefined, true),
  true,
);
assert.equal(
  isAllowedPersonalOrigin("http://127.0.0.1:3000/", undefined, true),
  true,
);
assert.equal(
  isAllowedPersonalOrigin("http://[::1]:3000/", undefined, true),
  true,
);
assert.equal(
  isAllowedPersonalOrigin("http://cadence.test:3000/", undefined, true),
  false,
);
assert.equal(
  isAllowedPersonalOrigin("http://127.0.0.1:3001/", undefined, true),
  false,
);
assert.equal(
  isAllowedPersonalOrigin("http://127.0.0.1:3000/", undefined, false),
  false,
);
assert.equal(
  isAllowedPersonalOrigin(
    "http://127.0.0.1:3000/",
    "http://localhost:3000",
    false,
  ),
  true,
);
assert.equal(
  isAllowedPersonalOrigin(
    "https://cadence.example/",
    "https://cadence.example",
    false,
  ),
  true,
);
assert.equal(
  isAllowedPersonalOrigin(
    "http://127.0.0.1:3000/",
    "https://cadence.example",
    true,
  ),
  false,
);
