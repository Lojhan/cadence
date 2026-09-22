import { strict as assert } from "poku";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DialogBody,
  Field,
  Input,
  SegmentedControl,
  Select,
  Surface,
  Textarea,
} from "../../packages/ui/src/index.tsx";

const field = renderToStaticMarkup(
  createElement(
    Field,
    { label: "Email", hint: "We will send a code." },
    createElement(Input, { type: "email", name: "email", required: true }),
  ),
);
assert.ok(field.includes("<label"));
assert.ok(field.includes("Email"));
assert.ok(field.includes("We will send a code."));
assert.ok(field.includes('data-slot="input"'));
assert.ok(field.includes('type="email"'));
const inputRef = createRef<HTMLInputElement>();
createElement(Input, { ref: inputRef, "aria-label": "Focus target" });

const textarea = renderToStaticMarkup(
  createElement(Textarea, { "aria-label": "Chart", rows: 4 }),
);
assert.ok(textarea.includes('data-slot="textarea"'));

const select = renderToStaticMarkup(
  createElement(
    Select,
    { label: "Tuning", value: "standard", onChange: () => {} },
    createElement("option", { value: "standard" }, "Standard"),
  ),
);
assert.ok(select.includes('data-slot="select"'));
assert.ok(select.includes('aria-label="Tuning"'));
assert.ok(select.includes('value="standard"'));

const segmented = renderToStaticMarkup(
  createElement(SegmentedControl, {
    label: "Practice settings",
    value: "library",
    options: [
      { value: "library", label: "Music" },
      { value: "settings", label: "Setup" },
    ],
    onChange: () => {},
  }),
);
assert.ok(segmented.includes('aria-label="Practice settings"'));
assert.ok(segmented.includes('aria-current="page"'));
assert.equal((segmented.match(/data-slot="segment"/g) ?? []).length, 2);

const surface = renderToStaticMarkup(
  createElement(Surface, { as: "section" }, "Content"),
);
assert.ok(surface.includes('data-slot="surface"'));
assert.ok(surface.startsWith("<section"));
assert.ok(
  renderToStaticMarkup(createElement(DialogBody, null, "Content")).includes(
    'data-slot="dialog-body"',
  ),
);
