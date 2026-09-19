import { strict as assert } from "poku";
import { violations } from "../../tooling/boundaries.ts";

assert.deepEqual(violations("ui", "import { Button } from 'react';"), []);
assert.ok(violations("ui", "import {db} from '@cadence/db/sqlite';").length);
assert.ok(violations("core", "export { x } from '@cadence/features';").length);
assert.ok(
  violations("features", "const db = await import('@cadence/db/postgres');")
    .length,
);
assert.ok(violations("music", "import x from '../../db/src/index';").length);
assert.ok(violations("contracts", "import Stripe from 'stripe';").length);
assert.ok(violations("core", "const x = require('node:fs');").length);
assert.deepEqual(
  violations("db", "import { x } from '@cadence/application';"),
  [],
);

assert.ok(
  violations("ui", "import x from 'unlisted/subpath';", ["react"]).some(
    (error) => error.includes("Undeclared dependency"),
  ),
  "runtime imports must belong to the package's declared dependencies",
);
assert.deepEqual(
  violations("ui", "import x from '@radix-ui/react-dialog';", [
    "@radix-ui/react-dialog",
  ]),
  [],
);
assert.deepEqual(
  violations("db", "import { readFile } from 'node:fs/promises';", []),
  [],
);
assert.ok(
  violations("core", "import { readFile } from 'fs/promises';", []).length,
  "bare Node builtins cannot bypass browser boundaries",
);
assert.ok(
  violations("core", "import React from 'react';", ["react"]).length,
  "declaring React does not make it valid in the pure practice core",
);
