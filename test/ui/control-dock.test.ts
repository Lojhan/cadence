import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ControlDock,
  DockButton,
  DockButtonMenu,
  DockDivider,
  DockMenuItem,
} from "../../packages/ui/src/index.tsx";

const dock = renderToStaticMarkup(
  createElement(
    ControlDock,
    { label: "Test controls", active: true },
    createElement(DockButton, { label: "Start", onClick: () => {} }, "Start"),
    createElement(DockDivider),
    createElement(
      DockButtonMenu,
      { label: "Choose profile", icon: "Profile" },
      createElement(
        DockMenuItem,
        { selected: true, onSelect: () => {} },
        "Standard",
      ),
    ),
  ),
);
assert.ok(dock.includes('aria-label="Test controls"'));
assert.ok(dock.includes('class="transport idle-ui listening'));
assert.ok(dock.includes('aria-label="Start"'));
assert.ok(dock.includes('aria-label="Choose profile"'));
assert.ok(dock.includes('class="dock-divider"'));
