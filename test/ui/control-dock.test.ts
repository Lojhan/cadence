import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ControlDock,
  DockButton,
  DockButtonMenu,
  DockDivider,
  DockMenuItem,
  DockSwitch,
  DockSwitchAction,
  DockSwitchMenu,
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

const switchMarkup = renderToStaticMarkup(
  createElement(
    DockSwitch,
    { label: "Microphone", active: true },
    createElement(
      DockSwitchAction,
      { label: "Mute microphone", "aria-pressed": true },
      createElement("span", null, "signal"),
      createElement("span", null, "mic"),
    ),
    createElement(
      DockSwitchMenu,
      { label: "Microphone options", icon: "Options" },
      createElement(DockMenuItem, { onSelect: () => {} }, "Input"),
    ),
  ),
);
assert.ok(switchMarkup.includes('aria-label="Microphone"'));
assert.ok(switchMarkup.includes('aria-pressed="true"'));
assert.ok(switchMarkup.includes('aria-label="Microphone options"'));
assert.ok(switchMarkup.includes("dock-switch-action"));
