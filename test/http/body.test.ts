import { strict as assert } from "poku";
import { bodyWithinLimit } from "../../apps/web/src/server/body-limit.server.ts";

const request = new Request("http://localhost:3000", {
  method: "POST",
  body: "12345",
});
assert.equal(request.headers.has("content-length"), false);
assert.equal(await bodyWithinLimit(request, 5), true);
assert.equal(
  await request.text(),
  "12345",
  "inspection preserves framework input",
);
assert.equal(
  await bodyWithinLimit(
    new Request("http://localhost:3000", { method: "POST", body: "123456" }),
    5,
  ),
  false,
  "missing length cannot bypass the byte limit",
);
assert.equal(
  await bodyWithinLimit(
    new Request("http://localhost:3000", {
      method: "POST",
      headers: { "content-length": "100" },
      body: "x",
    }),
    5,
  ),
  false,
);
assert.equal(
  await bodyWithinLimit(new Request("http://localhost:3000"), 5),
  true,
);
