import { strict as assert } from "poku";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DialogBody,
  Field,
  Input,
  Select,
  Surface,
  Tabs,
  TabsContent,
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

const tabs = renderToStaticMarkup(
  createElement(
    Tabs,
    {
      label: "Practice settings",
      value: "library",
      options: [
        { value: "library", label: "Music" },
        { value: "settings", label: "Setup" },
      ],
      onChange: () => {},
    },
    createElement(TabsContent, { value: "library" }, "Music library"),
    createElement(TabsContent, { value: "settings" }, "Settings"),
  ),
);
assert.ok(tabs.includes('role="tablist"'));
assert.ok(tabs.includes('aria-label="Practice settings"'));
assert.equal((tabs.match(/role="tab"/g) ?? []).length, 2);
assert.ok(tabs.includes('aria-selected="true"'));
assert.ok(tabs.includes('role="tabpanel"'));
assert.ok(tabs.includes("Music library"));
assert.ok(!tabs.includes('aria-pressed="true"'));

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
