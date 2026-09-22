import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, IconButton } from "../../packages/ui/src/index.tsx";

const primary = renderToStaticMarkup(
  createElement(Button, { variant: "primary", size: "lg" }, "Continue"),
);
assert.ok(primary.includes('data-slot="button"'));
assert.ok(primary.includes('data-variant="primary"'));
assert.ok(primary.includes('data-size="lg"'));
assert.ok(primary.includes("bg-primary"));

const icon = renderToStaticMarkup(
  createElement(IconButton, { label: "Settings", size: "lg" }, "S"),
);
assert.ok(icon.includes('aria-label="Settings"'));
assert.ok(icon.includes('data-slot="icon-button"'));
assert.ok(icon.includes('data-size="lg"'));
