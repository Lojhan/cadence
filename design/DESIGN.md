# Cadence — product and design specification

Status: visual direction reviewed; technical architecture specified. September 19, 2026.

Implementation stack and package contracts: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md).

The existing application is a disposable proof of concept. It is neither a release candidate nor the architecture for the new product. This document and `prototype.html` describe a fresh implementation. No POC code has been deleted during this design phase.

## Product intent

Cadence helps beginners practice guitar chords with a real instrument, at their own pace. It shows the chord to play and a clear fingering diagram, listens locally, and advances when the player succeeds. The interface should leave the musician's attention on their hands and instrument.

The core is free to use, modify, and self-host. A paid, managed edition removes installation and maintenance: sign in, choose music, and practice. Both editions offer the same core practice experience, default repertoire, import capability, and accessibility settings.

## Decisions and working assumptions

Confirmed by the brief:

- Replace all existing implementation after phase 0 review.
- Produce two repositories: public core and private managed edition.
- Self-hosting is free, with a single-command container startup and configurable storage.
- Hosted sign-in uses Clerk. Hosted billing uses Stripe with lifetime, monthly, and annual options.
- Practice has no scrolling. Current chord, fretboard, and bounded timeline remain visible; utility controls fade after four idle seconds.
- Include default music and let users import more.
- Make the fret visualization configurable, including left-handed use.

Confirmed clarification: Clerk and Stripe belong **only in the private hosted version**. Self-hosting needs no external accounts. The public core defines vendor-independent interfaces and must provide its free local experience without SaaS credentials. Neon, Supabase, or another PostgreSQL host may be configured voluntarily; none is required for local startup.

Other proposed defaults, subject to review: standard six-string guitar tuning; self-paced chord practice for MVP; SQLite for single-container personal use and PostgreSQL for multi-user or managed hosting; local single-user identity for the default self-hosted mode. The public core is MIT licensed. Prices, trial policy, and precise lifetime terms remain undecided. The old $19 mock price is not a requirement.

## Visual direction and interaction

Warm off-white background, deep green text, generous empty space. A large serif chord name sits beside a vertical fret diagram on desktop and above it on phones. String lines and frets are subdued; pressed notes are solid and legible. Avoid cards, dashboards, pitch charts, achievement graphics, and manually scrolling timelines in practice.

### Practice surface

The active musical content contains only:

1. Current chord symbol.
2. Fret visualization, with configurable finger numbers, muted/open string marks, string labels, barre marks, and fret position when needed.
3. A compact chord progression timeline below the practice area: current chord centered, up to two previous and two upcoming events, with a subtle current-step marker.

No permanent song title, chord count, confidence percentage, account avatar, billing prompt, metronome controls, or explanatory copy. Successful matches briefly alter the existing chord/diagram appearance before the next chord appears. Do not add celebratory overlays or use color as the sole source of essential information.

An icon-only, fully rounded bottom dock groups microphone and music library, with a vertical divider after the microphone group. Its surface is close in color to the page background in both themes, with a faint border and no drop shadow. The mic and its right-side device chevron share a pill. The chevron points up while closed and down while the device picker is open. Use accessible names and desktop tooltips, with no visible button labels. The logo sits at the top left. Settings sits at the top right with the theme toggle immediately to its left.

Bare previous/next chevrons flank the practice area, outside the dock, with no circular border or visible button background; invisible hit areas remain at least 44×44 pixels. Previous is shown only when the current event has a preceding event; Next only when it has a following event. Manual navigation is bounded by the chart, even when automatic practice looping is enabled. Navigating manually resets pending recognition and is never counted as an earned match.

After four seconds without interaction, the logo, dock, top-right controls, and side arrows fade away. The current chord and fretboard remain visible and keep their positions. The chord timeline fades to a quieter 72% opacity but never hides. It returns to full opacity on interaction. Pointer movement, keyboard interaction, or a deliberate tap reveals the full interface. The first tap on an idle screen only reveals controls and must not accidentally toggle audio or navigate. Keep controls visible while a menu/device picker is open or keyboard focus is visibly on a control. Reduced-motion mode changes visibility immediately without fading. Microphone listening continues in this idle view; returning from idle does not request permission or change mute state.

The microphone button switches between muted and listening states, with a crossed microphone when muted, an accessible pressed state, and animated signal bars while listening. State/action names are announced through accessible labels rather than displayed as text. The device picker lists available audio inputs, marks the selected input, and supports touch and keyboard selection. Production enumerates actual browser devices, requests permission only after a user gesture when necessary, handles generic labels before permission, and displays empty/error states. Selecting a new device mutes the current input, clears pending matches, and initializes the selected device before explicit unmute. Persist device IDs only on the local browser. In this prototype the picker explicitly contains example devices and never requests microphone access.

In production, signal animation reflects actual input energy and stops on silence; a static state still indicates that the microphone is enabled. Muting disables microphone tracks immediately, stops analysis/progression, and clears pending matches. Unmuting resumes only after permission/device readiness; failure leaves the control muted and opens actionable recovery. Opening a menu mutes/pauses practice; closing it leaves practice paused. Never persist an enabled microphone across reloads.

Chord progression uses a brief success tint followed by a short fade/vertical transition of the chord and fingering diagram. Keep layout anchors stable as symbols change. Reduced-motion preference disables movement and pulsing, preserving static state cues. Side-arrow navigation is manual and does not show recognition success. The explicit simulated-match action remains in the Practice menu for review.

Light mode preserves warm paper and deep green; dark mode uses charcoal-green surfaces and pale sage. Theme defaults to the OS on first use and an explicit top-right theme toggle persists the user's choice. Both modes cover the complete interface, dialogs, form fields, SVG string labels, and finger markers.

Phone layouts center the chord over the diagram in the available area above the dock. Desktop/landscape layouts align them side by side. Reserve dock height and device safe-area insets so controls never overlap the diagram. Buttons provide at least 44×44 CSS pixels, with visible focus and accessible labels. Escape opens the practice menu; Space toggles microphone state when focus is outside another control. Screen readers receive chord descriptions without repeated announcements from visual audio animation.

Zero scrolling applies to the **active practice surface**, which must fit both axes within the viewport. Library, settings, and account dialogs may scroll internally, including at text zoom. This is an explicit interpretation for review: prohibiting all scrolling in arbitrary imported libraries would require pagination and more constrained forms. Never clip essential controls just to satisfy a no-scroll metric.

The timeline advances with the practice state, using a short fade/vertical easing that never makes the entire timeline disappear. Show event order, including repeated chords, rather than unique chord names. The timeline is text-only, with no connecting lines or background fills. It is bounded to the current pass through the song: never preview the first chord beyond the final event, even when looping is enabled. Leave unavailable slots empty; after the actual loop restart, display the beginning normally. Keep the current chord centered, with no user scrolling or layout shift. The timeline is informational, with screen-reader descriptions and `aria-current="step"`; side chevrons remain the manual navigation controls. Respect reduced-motion preferences.

### Dialog and form design

Dialogs use consistent 28 px desktop and 20 px phone content insets, a compact header with an SVG close button, a four-tab segmented navigation bar, and an independently scrolling content area. Form rows align label/help text with 180 px controls on desktop and stack into full-width fields on phones. Native selects retain platform keyboard and touch pickers, with custom surface, border, spacing, and a decorative SVG chevron replacing browser arrow chrome. Fields are at least 48 px high (50 px on phones) and phone input text is 16 px to avoid focus zoom. All UI icons are inline SVG, including close, tabs, search, import, selection, navigation, and action icons; musical notation is retained as notation. Both themes share dimensions, visible focus, and readable contrast.

### Prototype review

Open `prototype.html` directly in a browser; it is one HTML file with inline CSS, SVG, and JavaScript. No build, dependencies, fonts, or network access are needed.

- Choose music to select a practice progression or import a chart.
- Icon-only bottom dock: microphone previews listening, adjacent right chevron opens the example input-device picker, music opens the library. At the top right, moon/sun switches theme and sliders opens preferences. Side chevrons and arrow keys move between existing steps. After four seconds idle, the chord and fretboard remain and the timeline dims without hiding; tap/move/type to reveal. Space mutes/unmutes and Escape opens the practice menu.
- Setup changes handedness, finger numbers, matching preference, and repeat/finish behavior. Matching preference is stored but has no audio effect in this preview.
- Practice contains the explicit match simulation and restart actions.
- Account previews self-hosted and hosted contexts. It does not contact Clerk or Stripe.
- Imports and settings persist in browser storage under a prototype-only key. The production app stores durable user data in its database.

The prototype deliberately has no live recognition, real accounts, billing, database, or song scraping. Its limited chord vocabulary is identified in the import form. These limits are not production product limits. Recognition errors, device onboarding, billing lifecycle, and import editing are specified below but are not fully mocked in this first visual review.

Initial-version browser checks (before the persistent dock revision): desktop 1280×633, phone 360×640, and landscape 844×390 viewport bounds; hidden controls during active practice; simulated C→G advancement; Escape menu; left-handed rendering and finger-number toggle; importing and persisting a four-chord chart. Desktop and phone screenshots were visually inspected. No browser errors were reported during these checks. This is interaction/layout verification, not audio or production acceptance testing.

Revision 2 browser checks: 390×844 and 320×568 portrait, 844×390 landscape, and 1440×900 desktop. Phone/landscape page dimensions equal viewport dimensions; the fretboard and dock do not overlap. Dock targets are at least 44×54 pixels on the smallest tested phone. Verified microphone preview toggle, simulated C→G progression, light/dark switching, and settings access; visually inspected dark phone and light desktop layouts. No browser errors were reported. Real hardware microphone behavior remains outside this prototype.

Prior revision checks: icon-only dock fits 320×568 with touch targets at least 44×48 pixels; device selection persists in preview settings and Escape dismisses the picker. Previous is hidden at the first chord and Next at the last. After four idle seconds, computed visibility leaves the chord visible and hides the fretboard/dock; arrow-key interaction restores the interface. The microphone chevron uses an upward path when closed and rotates downward while expanded.

Timeline revision verification: idle opacity stays at 0.72 with visible status; current timeline event matches the large chord after navigation. At 320×568 portrait and 844×390 landscape the timeline fits between the fretboard and dock without overlap or page scrolling.

Modal revision checks: visually inspected dark phone (390×844) and light desktop (1440×900) layouts; changed handedness through the styled native select; verified 50 px mobile fields, no horizontal content overflow at 320×568, and SVG replacements for character-based button icons.

## Functional requirements

### FR-01: Entry and onboarding

- First launch leads to a ready-to-practice default progression, with setup available on demand.
- Hosted users authenticate with Clerk before accessing their private library. Sign-in returns them to their intended page.
- First practice start requests microphone permission only following an explicit user gesture.
- Present a short setup dialog for playing hand, input device, and a sound check. Remember successful setup; provide a visible way to change it from the menu.
- Do not promise that account sign-in eliminates browser microphone permission or necessary instrument setup.
- Remember song, position, fingering preferences, and settings. Reopening is paused; never reopen a microphone automatically.

### FR-02: Practice session

- Display exactly one current chord with a musically accurate playable fingering.
- Default pacing waits indefinitely for a correct chord. Wrong chords and silence do not consume lives, produce alarm sounds, or force progress.
- Support microphone mute/unmute from the bottom dock; restart, manual next/previous, and repeat/finish from the dock/menu or documented shortcuts. Manual navigation must not be recorded as recognition success.
- A new chord is eligible for recognition only after the prior transition finishes; discard stale audio results.
- For adjacent identical chords, require a new strum/onset or defined release/reattack. A sustaining chord must not complete several steps.
- Pausing, switching input, opening menus, backgrounding, or changing songs resets pending match accumulation. Return to a ready state after an interrupted audio stream.
- Repeat returns to the first chord. Finish stops progression and shows a quiet completion dialog with Repeat and Choose music; no confetti.
- Preserve full sequence order and repeats. Do not deduplicate imported chord events.
- MVP is self-paced. Metronome and timed pacing are deferred unless specifically approved; do not carry the POC's timer behavior forward by default.

### FR-03: Audio and recognition

- Capture and analyze audio in the browser. Do not upload, record, persist, or log raw audio by default.
- Support permission granted, denied, missing device, disconnected device, suspended audio, silence, excessive noise, and unsupported browser states. Explain recovery in an on-demand setup/error dialog; never silently advance.
- Check the expected chord, with rejection of plausible confusable chords; do not describe this as arbitrary transcription or finger-position detection.
- Provide Gentle, Balanced, and Precise matching settings. Determine thresholds from labeled real guitar recordings, not from attractive-looking prototype percentages.
- Use stable matching over a measured interval and enforce onset/release rules. Treat initial 150–300 ms matching windows as experiments, not guaranteed total latency.
- Expose input selection and signal checks only in Setup. No live diagnostics in active practice.
- Account for room noise, harmonics, acoustic/electric timbre, quiet notes, incomplete strums, device sample rates, and speaker feedback. Start with standard tuning, A4=440 Hz; communicate this scope in Setup.
- Never allow guide audio or a virtual test generator to count as the player's success in production. Keep any synthetic test harness outside the production practice UI.
- Rust/WASM owns audio analysis, chord matching, match stability, and onset/rearm rules. TypeScript owns browser capture/device lifecycle and practice/UI orchestration. Use an AudioWorklet capture path feeding a dedicated WASM worker, as specified in [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md); no separate JavaScript matcher.
- Acceptance requires a labeled real-instrument corpus, confusion matrix, false-advance rate, missed-match rate, and latency distributions. Include incorrect chords, silence/noise, repeated chords, and sustained sounds. Agree numerical release thresholds before declaring the engine ready; synthesized input alone is insufficient evidence.

### FR-04: Fret visualization

- Show correct string order, frets, open/muted strings, barres, starting fret, and finger numbers for each supported voicing. Render a barre as a slim rounded line at its fret, ending at the covered strings, with one index-finger marker/number. Avoid a thick filled block or repeated index-finger numbers; other fingers retain their separate circular markers. Mirror the barre and its anchor marker in left-handed mode.
- Left-handed mode mirrors the entire diagram consistently: string labels, finger markers, and barre endpoints.
- Allow finger-number visibility, larger diagram sizing, and alternate fingerings when curated alternatives exist. Persist choices per user and, where appropriate, per chord.
- Never reuse an unrelated fallback fingering for an unknown chord. Mark unsupported chords in import review and require correction or an explicit compatible substitution before practice.
- Use curated and tested chord/voicing data with source/license provenance. Scope the initial vocabulary explicitly, beginning with common major/minor open and barre chords and expanding to sevenths and suspensions when verified.
- Changing a voicing does not imply the microphone can validate which physical fingering was used. Detection validates the supported pitch content.

### FR-05: Music library

- Supply a small, useful repertoire: original exercises, common progressions, and appropriately licensed or public-domain arrangements. Record title, attribution, source, rights, and difficulty where relevant.
- Default music belongs to a versioned catalog; users may create editable copies without overwriting defaults.
- Search by title and chord; distinguish default repertoire from personal imports in the library panel, not on the practice surface.
- Select, rename, edit, duplicate, export, and delete personal entries. Confirm destructive deletion. Imported songs are private by default.
- Retain last-used music and restore position safely after edits. Revision or deletion of the current sequence must not leave an out-of-range step.
- A music entry is an ordered chord chart for MVP, not a backing recording or complete rhythmic transcription. More advanced rhythm, capo, transposition, tunings, notation, and lyrics-following require separate scope.

### FR-06: Import and portability

- MVP input: pasted chord-only text, bracketed chord charts, and UTF-8 `.txt`/`.cho` uploads using a documented supported ChordPro subset.
- Show a parsed preview before saving, including the ordered chords, repeats, and any warnings with their source positions.
- Do not misinterpret ordinary lyric words such as “A” as chords. Unbracketed mixed lyrics require recognized chord-only lines or user correction.
- Explicitly handle enharmonic spelling, supported qualities, repeat instructions, and unsupported syntax. Do not silently turn unknown chords into C major or misparse `maj7`/`m7` as `m`.
- No automatic scraping from song sites, PDF/OCR, audio-to-chord transcription, or fetching arbitrary URLs in MVP.
- Proposed limits: 1 MiB text file and 10,000 chord events per song; validate on both client and server and give actionable errors. User library size has no artificial paid-feature restriction in self-hosted core.
- Retain original input when requested so users can repair parsing; sanitize all rendered text and never execute imported HTML.
- Versioned JSON export/import includes personal songs, preferences, and supported progress state. Validate archives and resolve ID collisions. Exclude secrets, auth tokens, and payment identifiers from portable data.
- Hosted users can export their data for self-hosting; self-hosted users can import into the hosted edition. Vendor identity IDs are not portable primary keys.

### FR-07: Preferences and persistence

- Persist handedness, visualization preferences, light/dark theme choice, preferred voicings, recognition setting, loop preference, last song, and position.
- Keep device-specific microphone selection local to each browser; device IDs are not meaningful on another computer.
- Save user changes with visible retry/recovery on failure. A transient network loss should not interrupt an already loaded local practice session.
- Cache the active chart and settings for the current session. Full offline installation and editing are deferred; do not promise full offline hosting or authentication.
- Hosted configuration and library synchronize after sign-in. Use revisions/optimistic concurrency to prevent silent overwrites from multiple devices.

### FR-08: Identity and user boundaries

- Core uses an internal stable user ID and a replaceable identity adapter.
- Default personal container runs as a single local user on localhost without external accounts. It is not a public anonymous multi-user service.
- For internet exposure, require an authenticated deployment profile with trusted identity verification; fail startup if a public multi-user mode has no auth configured. Specify and implement a vendor-independent self-hosted identity option before supporting that profile.
- Private hosted adapter maps verified Clerk identities to core users. Validate sessions server-side and authorize every user's library/configuration access; never trust a user ID supplied by the client.
- User deletion/export flows cover both application data and identity linkage. Define retention for billing records independently from practice data.
- No teams, classroom roles, social feed, or public user-generated catalog in MVP.

### FR-09: Hosted billing

- Offer monthly and annual recurring plans plus a separate one-time lifetime entitlement. Prices and availability are configuration, not literals in the practice UI.
- Use Stripe Checkout for purchase and customer portal for supported subscription/payment management. Clearly present amount, interval, and terms before payment.
- Grant access from verified server-side payment/subscription state, never the success URL or browser storage. Handle delayed payment methods before granting lifetime access.
- Verify webhook signatures and process events idempotently. Handle duplicates, retries, and out-of-order events; reconcile against authoritative current state when necessary.
- Cover new purchase, renewal, cancellation at period end, expiration, payment failure, recovery, refund, dispute, and plan changes. Avoid simultaneous paid subscription and lifetime billing; define conversion treatment before offering upgrades.
- Proposed access policy: active/trialing subscriptions receive hosted practice; cancellation retains access to the paid-through date; payment failure receives a configurable grace period; expired access still permits account management and export. Lifetime access persists unless refunded/revoked under disclosed terms.
- Define “lifetime” precisely before launch: entitlement scope, whose lifetime, service availability, support, and future products. Do not implicitly sell unlimited future operating costs for the old POC price.
- Billing and entitlement enforcement are absent from the free personal core. No upsells interrupt practice. Hosted checkout occurs outside the practice surface.

### FR-10: Accessibility and responsive behavior

- Fit active practice at minimum 360×640 portrait, 844×390 landscape, 768×1024 tablet, and 1440×900 desktop. Test small devices and browser chrome changes, not only fixed desktop screenshots.
- Support keyboard navigation, Escape/Space shortcuts, visible focus, dialog focus trapping/return, screen-reader labels, reduced motion, and sufficient text/diagram contrast.
- Aim for at least 44×44 CSS pixel touch targets. Handedness must not reorder keyboard navigation.
- At 200% zoom, keep chord and diagram usable and allow configuration dialogs to scroll. No hidden essential content caused by fixed dimensions.
- Errors and completion have readable text outside active practice. Do not rely solely on animation, color, or sound.

## Two-repository architecture

| Concern | Public `cadence` | Private `cadence-cloud` |
| --- | --- | --- |
| Practice UI and audio engine | Complete and free | Reuses public implementation |
| Chord data, default repertoire, import/export | Complete and free | Same core capabilities |
| User preferences and music storage | Repository interfaces + SQLite/Postgres adapters | Managed Postgres configuration |
| Identity | Local personal mode + adapter contract; self-hosted authenticated profile to be specified | Clerk adapter and account UI |
| Billing | None required | Stripe adapter and hosted entitlements |
| Packaging | Container image, Compose, migrations, operating guide | Managed deployment, secrets, operations |
| Product updates | Public release tags, changelog, migration contract | Pins and regularly integrates public releases |

Use the private repo as a thin downstream distribution rather than independently rewriting the core. Prefer pinned public packages/releases with explicit extension interfaces. If implemented as a literal fork, track an upstream remote and keep private changes confined to adapters and deployment; regularly integrate upstream and return core fixes to the public project. No manual copy/paste synchronization.

The implementation uses TanStack Start, pnpm workspaces, and Drizzle. The public repo separates contracts, music, practice core, generated WASM, browser audio, UI, React features, server application use cases, and database adapters; a Cargo workspace owns DSP, recognition, bindings, and offline evaluation. The private repo composes published public packages with Clerk, Stripe, and private PostgreSQL tables. See [the technical specification](./TECHNICAL_SPEC.md) for the authoritative directory layout and allowed dependency graph.

The public core uses MIT, as selected by the owner. The private hosted distribution remains proprietary. Contributor policy and catalog rights must be documented separately; the code license does not grant rights to imported music.

## Container and database contract

The following is the **target operator experience**, not a working command or published image today:

```sh
docker run --detach --name cadence \
  --publish 127.0.0.1:3000:3000 \
  --volume cadence-data:/data \
  ghcr.io/<owner>/cadence:<release>
```

Defaults: local single-user identity, SQLite at `/data/cadence.db`, persistent named volume, no provider keys, no billing, automatic safe initialization. Document Docker as a prerequisite. Opening localhost supports the intended local browser setup; access from other devices needs a configured HTTPS deployment for microphone capture.

Configuration contract:

| Variable | Proposed purpose |
| --- | --- |
| `DATABASE_URL` | `file:/data/cadence.db` by default; PostgreSQL connection URL for external storage |
| `APP_ORIGIN` | Public origin used for origin validation and redirects |
| `AUTH_MODE` | `local` for personal use; explicit authenticated adapter for other supported profiles |
| `LOG_LEVEL` | Operational logs without raw audio, chart contents, or secrets |

Neon and Supabase are candidate PostgreSQL providers, not separate application database engines. The public app should use ordinary PostgreSQL connections and migrations rather than require their auth, realtime, or proprietary APIs. A custom PostgreSQL server must be equally supported. Keep database credentials server-side and support provider-required TLS and pooling settings. SQLite and Postgres support must be exercised against the same repository contract tests; provider independence is not automatic.

Also ship Compose for app + local PostgreSQL with persistent volumes. Document backup/restore, upgrades, database migration failure recovery, health/readiness checks, non-root runtime, amd64/arm64 builds, and supported versions. Use pinned release tags. On a blank database startup initializes once; incompatible/newer schema versions fail clearly. Do not perform destructive schema migrations silently during startup.

The hosted edition adds server-only Clerk/Stripe secrets, webhook configuration, and managed database configuration. Public container builds must not contain private code, paid checks, or embedded provider credentials.

## Data model and application boundaries

| Entity | Minimum fields / responsibility |
| --- | --- |
| User | Internal ID, timestamps; auth provider links are separate |
| Identity link | Provider, subject ID, internal user ID; unique provider/subject |
| Preferences | User ID, schema version, handedness, display, matching, repetition, revision |
| Song | ID, owner/catalog scope, title, attribution, source/rights, chart version, revision |
| Chord event | Song ID, sequence order, chord symbol, voicing reference, optional section metadata |
| Practice position | User/song IDs, song revision, event index, completion; no raw audio |
| Hosted customer | Internal user ID, Stripe customer reference; private edition |
| Hosted entitlement | User, plan kind, status, paid-through/grace timestamps, purchase reference |
| Processed billing event | Provider event ID, handling status, timestamps for idempotency |

Core services: list/get/save/delete music, parse/validate imports, export/import personal data, read/update preferences, and save position. All writes validate input and ownership at the server boundary. Audio analysis and chord matching remain client-side. Do not expose a generic SQL interface to browsers.

## Validation and phase gates

### Phase 0 — design review (this delivery)

- Review HTML on desktop and mobile: visual density, chord/diagram scale, handedness, control discovery, pause behavior, and import flow.
- Public/private integration boundary is confirmed: Clerk/Stripe private only, no external accounts for self-hosting. Review whether zero-scroll applies to dialogs as well as practice.
- Agree scope, supported guitar/chord vocabulary, storage defaults, and hosted purchase terms. Record remaining unknowns rather than inventing commitments.

### Phase 1 — discard POC

- After design review, delete existing source, build output, dependencies/lockfile, and POC-specific tooling/configuration. Preserve approved design artifacts.
- The deletion is intentional and authorized as this project phase; do not quietly reuse its recognition engine, copied UI, mock billing, or chord fallback logic.
- Check the actual directory contents at deletion time to avoid removing later unrelated user work. Establish clean version control and the chosen license for the replacement.

### Phase 2 — build public core and packaging

- Create the public repo scaffold, contracts, storage adapters, and pure practice state machine.
- Implement and test accurate chord/voicing data and safe import/export.
- Build the reviewed interface and calibrate recognition against real recordings and live instruments.
- Verify one-command clean startup, persistence after restart, SQLite/Postgres parity, backup/restore, and supported-browser microphone recovery.
- Publish only after recognition acceptance targets and the no-scroll/accessibility checks pass.

### Phase 3 — assemble private hosted edition

- Integrate public release, Clerk auth, managed Postgres, Stripe purchases, account/export flows, and operational monitoring.
- Test tenant isolation and identity deletion; replay webhook events for each lifecycle; prove that success-page navigation cannot grant access.
- Verify that signing in on a second device restores music/preferences without carrying over device-specific microphone IDs.
- Release gates include payment-state correctness, data recovery, entitlement expiry behavior, and portability back to the free core.

## Explicit non-goals for the first release

No AI tutor/chat, lesson marketplace, gamification dashboard, live pitch visualization, song-site scraping, backing-track sync, polyphonic transcription of unknown music, rhythm scoring, alternate tunings, multiplayer, teacher console, or mobile native application. These require separate decisions rather than inheriting decorative POC controls.

## Source notes

Integration choices above are architectural proposals. Current provider behavior should be checked again during implementation:

- [Clerk architecture](https://clerk.com/docs/guides/how-clerk-works/overview): hosted identity/session model behind the managed adapter.
- [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions): one-time payment and subscription sessions are distinct purchase modes.
- [Stripe webhooks](https://docs.stripe.com/webhooks): payment lifecycle requires authenticated, retry-safe server processing.
- [Neon connection documentation](https://neon.com/docs/connect/connect-from-any-app) and [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres): verify connection/pooling configuration for the selected PostgreSQL host.

This document proposes no final pricing, deployment provider, legal interpretation, or guarantee of recognition accuracy.
