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
