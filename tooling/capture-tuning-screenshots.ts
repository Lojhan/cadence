import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import React from "react";
import { renderToString } from "react-dom/server";
import { TUNING_PRESETS } from "../packages/music/src/tuning.ts";
import {
  ArrowLeft,
  Mic,
  MicOff,
  SlidersHorizontal,
  Sun,
  // @ts-expect-error
} from "../packages/ui/node_modules/lucide-react/dist/cjs/lucide-react.js";
import {
  Button,
  Fretboard,
  PracticeDock,
  TunerFretboard,
  TunerGauge,
  TuningSelect,
} from "../packages/ui/src/index.tsx";

const cadenceUiCss = readFileSync(
  resolve("packages/ui/src/styles.css"),
  "utf-8",
);

const outDir = resolve("artifacts/screenshots");
const artifactDir = resolve(
  "/Users/viniciuslojhan/.gemini/antigravity-cli/brain/c48fa3c2-f128-4eb2-9a7f-f3e8a4019dc1",
);
const desktopDir = resolve("/Users/viniciuslojhan/Desktop");

mkdirSync(outDir, { recursive: true });

function wrapInDocument(contentHtml: string, title = "Cadence") {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${cadenceUiCss}
  </style>
</head>
<body style="margin: 0; background: var(--paper); color: var(--ink); min-height: 100vh;">
  ${contentHtml}
</body>
</html>`;
}

// 1. Tuner Page Mockup
function renderTunerPage({
  presetId = "standard",
  selectedStringIndex = 0,
  detectedHz = 329.63,
  cents = 0,
  direction = "in_tune" as const,
  emergencyBreakRisk = false,
  listening = true,
}: {
  presetId?: string;
  selectedStringIndex?: number;
  detectedHz?: number;
  cents?: number;
  direction?: "in_tune" | "up" | "down" | "idle";
  emergencyBreakRisk?: boolean;
  listening?: boolean;
}) {
  const preset =
    TUNING_PRESETS.find((p) => p.id === presetId) ?? TUNING_PRESETS[0];
  if (!preset) throw new Error("Preset not found");
  const targetString = preset.strings[selectedStringIndex] ?? preset.strings[0];

  return React.createElement(
    "main",
    { className: "tuner-page" },
    React.createElement(
      "header",
      { className: "tuner-header" },
      React.createElement(
        "div",
        { className: "tuner-header-top" },
        React.createElement(
          "button",
          { className: "pill tuner-back-btn", type: "button" },
          React.createElement(ArrowLeft, { size: 16 }),
          React.createElement("span", null, "Back to Practice"),
        ),
        React.createElement(
          "span",
          { className: "tuner-save-status", role: "status" },
          "Auto-saved to preferences",
        ),
      ),
      React.createElement(
        "div",
        { className: "tuner-title-row" },
        React.createElement("h1", null, "Guitar Tuner"),
        React.createElement(
          "div",
          { className: "tuner-top-controls" },
          React.createElement(TuningSelect, {
            presets: TUNING_PRESETS,
            value: presetId,
            onChange: () => {},
          }),
          React.createElement(
            Button,
            {
              className: `tuner-listen-toggle ${listening ? "primary" : ""}`,
              onClick: () => {},
            },
            listening
              ? React.createElement(Mic, { size: 16 })
              : React.createElement(MicOff, { size: 16 }),
            React.createElement(
              "span",
              null,
              listening ? "Listening..." : "Start Tuning",
            ),
          ),
        ),
      ),
    ),
    React.createElement(TunerGauge, {
      string: targetString,
      detectedHz,
      cents,
      direction,
      emergencyBreakRisk,
      onPlayReference: () => {},
      playingReference: false,
    }),
    React.createElement(TunerFretboard, {
      strings: preset.strings,
      selectedStringIndex,
      onSelectString: () => {},
      hand: "right",
    }),
  );
}

// 2. Practice Stage with Tuner in Bottom Tray
function renderPractice({
  tuningMismatch = false,
}: {
  tuningMismatch?: boolean;
}) {
  return React.createElement(
    "div",
    {
      className: "app",
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
        position: "relative",
      },
    },
    // Standard Cadence Header
    React.createElement(
      "header",
      { className: "toolbar" },
      React.createElement("span", { className: "wordmark" }, "cadence"),
      React.createElement(
        "div",
        { className: "header-actions" },
        React.createElement(
          "button",
          {
            className: "icon-button",
            type: "button",
            "aria-label": "Switch color theme",
          },
          React.createElement(Sun, { size: 18 }),
        ),
        React.createElement(
          "button",
          {
            className: "icon-button",
            type: "button",
            "aria-label": "Open settings",
          },
          React.createElement(SlidersHorizontal, { size: 18 }),
        ),
      ),
    ),
    // Main practice stage (unobstructed, zero banners)
    React.createElement(
      "main",
      {
        className: "practice-sequence",
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          gap: "16px",
        },
      },
      React.createElement(
        "section",
        {
          className: "stage",
          style: {
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "4px" } },
          React.createElement(
            "h2",
            {
              style: {
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--ink)",
              },
            },
            "Everlong",
          ),
          React.createElement(
            "span",
            { style: { fontSize: "13px", color: "var(--muted)" } },
            "Foo Fighters",
          ),
        ),
        React.createElement(
          "h1",
          {
            className: "chord",
            style: {
              fontSize: "76px",
              margin: "0",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
            },
          },
          "D5",
        ),
        // Fretboard diagram
        React.createElement(
          "div",
          {
            style: {
              maxWidth: "380px",
              width: "100%",
              margin: "0 auto",
              padding: "16px",
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            },
          },
          React.createElement(Fretboard, {
            shape: {
              baseFret: 5,
              frets: [-1, 5, 7, 7, -1, -1],
              fingers: [0, 1, 3, 4, 0, 0],
            },
            symbol: "D5",
            numbers: true,
            hand: "right",
          }),
        ),
        tuningMismatch
          ? React.createElement(
              "span",
              { className: "tuning-status-label" },
              "Voicing adapted for Standard tuning",
            )
          : null,
      ),
    ),
    // Bottom Tray (PracticeDock) with Tuner Icon Button
    React.createElement(PracticeDock, {
      listening: true,
      busy: false,
      devicesOpen: false,
      onToggle: () => {},
      onDevices: () => {},
      onLibrary: () => {},
      onTuner: () => {},
      tuningMismatch,
      tuningTitle: tuningMismatch
        ? "Tuning mismatch: song recommends Drop D (guitar is in Standard)"
        : "Guitar tuner",
    }),
  );
}

async function captureAll() {
  const browser = await chromium.launch();

  const scenarios = [
    {
      name: "06-guitar-tuner-standard-in-tune",
      title: "Cadence — Guitar Tuner (Standard Tuning, In Tune)",
      html: wrapInDocument(
        renderToString(
          renderTunerPage({
            presetId: "standard",
            selectedStringIndex: 5, // High E (String 1, E4)
            detectedHz: 329.63,
            cents: 0,
            direction: "in_tune",
            listening: true,
          }),
        ),
        "Guitar Tuner — Standard In Tune",
      ),
    },
    {
      name: "07-guitar-tuner-low-e-flat-tune-up",
      title: "Cadence — Guitar Tuner (Low E Flat, Tune Up)",
      html: wrapInDocument(
        renderToString(
          renderTunerPage({
            presetId: "standard",
            selectedStringIndex: 0, // Low E (String 6, E2)
            detectedHz: 80.12,
            cents: -49,
            direction: "up",
            listening: true,
          }),
        ),
        "Guitar Tuner — Tune Up Flat String",
      ),
    },
    {
      name: "08-guitar-tuner-emergency-break-warning",
      title: "Cadence — Guitar Tuner (Emergency String Break Risk)",
      html: wrapInDocument(
        renderToString(
          renderTunerPage({
            presetId: "standard",
            selectedStringIndex: 5, // High E (String 1, E4)
            detectedHz: 355.2,
            cents: 128,
            direction: "down",
            emergencyBreakRisk: true,
            listening: true,
          }),
        ),
        "Guitar Tuner — Emergency String Break Warning",
      ),
    },
    {
      name: "09-practice-bottom-tray-tuner-normal",
      title: "Cadence — Practice Mode (Matching Tuning, Neutral Tuner Icon)",
      html: wrapInDocument(
        renderToString(renderPractice({ tuningMismatch: false })),
        "Practice — Tuner in Bottom Tray (Normal)",
      ),
    },
    {
      name: "10-practice-bottom-tray-tuner-mismatch-yellow",
      title: "Cadence — Practice Mode (Tuning Mismatch, Yellow Tuner Icon)",
      html: wrapInDocument(
        renderToString(renderPractice({ tuningMismatch: true })),
        "Practice — Tuner in Bottom Tray (Mismatch Warning)",
      ),
    },
  ];

  for (const item of scenarios) {
    // Desktop (1280x850)
    {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 850 },
      });
      await page.setContent(item.html, { waitUntil: "networkidle" });
      const filename = `${item.name}-desktop.png`;
      const outPath = resolve(outDir, filename);
      await page.screenshot({ path: outPath, fullPage: true });
      copyFileSync(outPath, resolve(artifactDir, filename));
      copyFileSync(outPath, resolve(desktopDir, filename));
      await page.close();
      console.log(`Saved desktop: ${filename}`);
    }

    // Mobile (390x844)
    {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await page.setContent(item.html, { waitUntil: "networkidle" });
      const filename = `${item.name}-mobile.png`;
      const outPath = resolve(outDir, filename);
      await page.screenshot({ path: outPath, fullPage: true });
      copyFileSync(outPath, resolve(artifactDir, filename));
      copyFileSync(outPath, resolve(desktopDir, filename));
      await page.close();
      console.log(`Saved mobile: ${filename}`);
    }
  }

  await browser.close();
  console.log("All tuning screenshots successfully captured!");
}

captureAll().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
