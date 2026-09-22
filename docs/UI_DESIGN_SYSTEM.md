# Cadence UI system

`@cadence/ui` owns the light/dark theme, interactive primitives, and presentational practice and tuner compositions. `@cadence/features` owns state and browser behavior. The hosted repo consumes a packed `@cadence/ui` release and adds only hosted flows; provider code never enters this package.

The theme source is `packages/ui/src/theme.css`. `tailwind.css` maps its semantic tokens into Tailwind v4. Reusable controls live in `primitives.tsx`, `form-primitives.tsx`, and `overlays.tsx`. Compositions use these controls while retaining authored CSS for string/gauge geometry, fretboards, and motion. The package release compiles Tailwind into the CSS artifact, so consumers import `@cadence/ui/styles.css` without scanning this package's source or installing Tailwind.

`packages/ui/components.json` makes the package a shadcn CLI target. `packages/ui/registry.json` records the Cadence base preset. From the workspace root, validate them with:

```sh
pnpm dlx shadcn@latest info --cwd packages/ui
pnpm dlx shadcn@latest build packages/ui/registry.json -o /tmp/cadence-shadcn-registry
```

The config deliberately points at owned component source through package import aliases. A generated component should be reviewed, adjusted to use the semantic theme, and exposed through `src/index.tsx`; it is not a runtime dependency on shadcn. Do not overwrite the custom tuner graphics with generic controls.

Current exported controls are `Button`, `IconButton`, `Field`, `Input`, `Textarea`, `Select`, `SegmentedControl`, `Surface`, `Dialog`, `DialogHeader`, `DialogBody`, `Sheet`, and `Popover`. `Select` wraps a native select and requires an accessible `label`. `SegmentedControl` takes controlled `value`, `options`, and `onChange`. `Popover`, `Dialog`, and `Sheet` use Radix focus and dismissal behavior. Use `data-slot` and semantic tokens for variants instead of copying entire CSS blocks between screens.

At 390px, the tuner string stage is vertical; at 768px and 1280px it is horizontal. The one preset chevron is adjacent to the whole board. Chromatic mode turns a needle around a fixed pivot and shows all twelve notes beneath it. Browser assertions cover those viewports, no document overflow, and preset persistence. The disposable HTML prototype remains a design reference and has no tests.

`packages/features/src/index.tsx` still combines practice orchestration, settings, library import, and account panel state in one large component. Splitting it into feature-level sections would improve reviewability, but should follow browser coverage for save, import, microphone, and modal flows; a blind split risks changing focus and save behavior. The remaining authored CSS describes distinct layout and animation roles. New controls should extend the shared primitives rather than reintroduce selectors tied to every input or button in a panel.
