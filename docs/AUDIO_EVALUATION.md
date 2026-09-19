# Audio evaluation

Recognition remains experimental. Synthetic tests verify engineering behavior;
they do not establish that the app reliably recognizes a beginner's instrument.
The stable-release targets in `design/TECHNICAL_SPEC.md` remain unmet.

## Reproduce the recording evaluation

Use GuitarSet v1.1.0 from [the original dataset record](https://zenodo.org/records/3371780).
The audio and annotations are CC BY 4.0, separately from Cadence's MIT code.
Download `audio_mono-mic.zip` and `annotation.zip` into `artifacts/guitarset/`.
The preparation command validates the published archive checksums, extracts
accompaniment recordings and annotations, and records each WAV's SHA-256:

```sh
python3 tooling/prepare-guitarset.py artifacts/guitarset
python3 tooling/prepare-strums.py artifacts/guitarset
pnpm --silent eval:audio artifacts/guitarset/calibration.json > artifacts/guitarset/calibration-report.json
pnpm --silent eval:audio artifacts/guitarset/calibration-strums.json > artifacts/guitarset/calibration-strums-report.json
```

When redirecting JSON, invoke the underlying command directly or use `pnpm --silent`
so pnpm's script banner is excluded. `cargo run --quiet --locked --release -p
cadence-eval -- MANIFEST.json` emits only JSON on stdout.

Players 00–03 are calibration; players 04–05 are held out. Freeze the engine and
selection rules before running `held-out.json` and `held-out-strums.json`.
Further tuning after inspecting held-out failures requires a fresh independent
validation set. Do not report calibration accuracy as held-out accuracy.

The broad set uses supported manually annotated chord segments, starts at their
first annotated note onset, and limits attempts to 1.5 seconds. It includes
partial/arpeggiated accompaniment; its positive labels therefore do not imply a
complete simultaneous chord. Major/minor counterparts provide confusable negative
targets. Seventh chords are not used as negative examples for their triad subsets.

The separate strum subset uses note annotations only: every target pitch class
must be attacked within 150 ms, no extra pitch class may be attacked in that
window, and every target class must still sound at 400 ms. A foreign note already
sounding invalidates the attempt; a later foreign-note onset ends its labeled
window. Require at least 500 ms before that boundary. This prevents a genuine
later chord change from being scored against an earlier label. Selection is independent
of recognition output. Both broad and subset results must be retained, including
excluded-case counts. A partial download is accepted only with `--allow-partial`
and is explicitly labeled; it is an engineering spike, not a release evaluation.

The native evaluator runs the production Rust recognition crate (Balanced by
default; an optional final `gentle`, `balanced`, or `precise` argument selects a profile), 2048-sample blocks, mono downmixing, and each file's sample rate. Each
case starts with a fresh armed engine. Reports include true/false positives and
negatives, per-chord groups, and p95 matched-case latency. Latency starts at the
selected annotated onset and ends at the reporting block boundary. It excludes
capture, worker scheduling, UI animation and hardware delay, and says nothing
about missed cases. It is not end-to-end device latency.

## Committed regression fixtures

`fixtures/audio/guitarset/` contains three attributed, checksum-verified calibration
excerpts. The C-major example originally failed to match; the F-major example
caught a false F-minor match during sensitivity tuning. The E-minor example
exposed upper harmonics being mistaken for an E-major third. Poku checks both expected
outcomes and native/WASM parity with the actual generated WASM artifact. These
fixtures are deliberately small regression examples, not an independent corpus.
They are not included in published packages or container runtime files.

## Remaining release evidence

The acoustic GuitarSet recordings do not cover electric guitars, different rooms,
phone microphone processing, browser permission recovery, speaker feedback or
beginner technique. The corpus also needs independent incorrect voicings,
silence/noise, continuous repeated-strum sessions and sustained-chord negatives.
Synthetic repeat/rearm and noise tests remain useful but cannot substitute for
those recordings. A stable release requires the specified held-out accuracy and
false-advance gates plus measured end-to-end latency on supported devices.

## Current calibration result

The complete published archives were verified and 180 accompaniment recordings
prepared. Only calibration players 00–03 were evaluated. The corrected strum
selection produces 233 positive cases and 203 wrong-quality targets; 1,129 broad
cases do not meet its selection rules. Player 04–05 evaluation remains untouched.

This comparison uses major/minor counterparts only. The expanded checks below
also test seventh chords and related roots.

| Balanced engine | Correct strums recognized | Wrong-quality matches | Matched-case p95 |
| --- | --- | --- | --- |
| Original alpha engine | 134 / 233 (57.5%) | 0 / 203 | 1,068 ms |
| Harmonic-aware engine | 209 / 233 (89.7%) | 0 / 203 | 511 ms |

Every previously accepted positive strum remains accepted in this comparison.
The broader accompaniment counts improve from 332/889 to 557/889 positives,
with 5/676 negative-target matches in each engine; coarse labels and incomplete
playing make those counts unsuitable as clean-strum acceptance evidence.

[The machine-readable comparison](evaluation/guitarset-calibration.json) records
source checksums, selection rules and every strum outcome. These are calibration
results. The 95% positive target is not met, held-out accuracy is not established,
and the latency number excludes the browser/device path. Keep the product alpha.

The DSP change suppresses estimated odd-harmonic energy, requires overtone
support for bass fundamentals, and reduces upper-partial weighting. Confirmation
requires each expected pitch class to dominate unexplained classes; small score
dips decay evidence instead of always discarding it. Repeated identical chords
retain attack/release gating, while a genuinely different target can match a
continuous chord change without requiring a silent gap.


## Expanded confusion checks

The original negative set was too narrow to assess the supported chord vocabulary.
Generate nearby targets from the verified strum windows, independently of engine
output:

```sh
python3 tooling/prepare-confusions.py artifacts/guitarset/calibration-strums.json artifacts/guitarset/calibration-confusions.json
pnpm --silent eval:audio artifacts/guitarset/calibration-confusions.json balanced > artifacts/guitarset/calibration-confusions-report.json
```

The target vocabulary is major, minor, dominant seventh, minor seventh and major
seventh in all 12 roots. Include every different target sharing at least two pitch
classes and differing in one or two classes. This includes adding/removing a
seventh and confusing related roots, such as C with Am. Each target receives the
same audio interval; the generator replaces the older major/minor-only negatives
rather than duplicating them. The evaluator reports performed→target confusion
counts as well as per-case target masks and labels.

| Profile | Correct strums recognized | Wrong targets accepted | Matched-case p95 |
| --- | --- | --- | --- |
| Gentle | 216 / 233 (92.7%) | 52 / 1,313 (4.0%) | 418 ms |
| Balanced | 209 / 233 (89.7%) | 27 / 1,313 (2.1%) | 511 ms |
| Precise | 152 / 233 (65.2%) | 6 / 1,313 (0.5%) | 882 ms |

[The detailed report](evaluation/guitarset-confusions.json) contains the confusion
matrix and false matches for every profile. None meets all proposed acceptance
targets. In particular, the earlier 0/203 major/minor result cannot be generalized
to all wrong chords. These per-target comparison rates are not an end-to-end
practice false-advance rate. All results remain calibration measurements on one
dataset; held-out players and real-device validation are still outstanding.

Two calibration experiments were rejected: lowering the peak cutoff lost an
existing correct match, and averaging chroma across frames increased false matches.
Neither experiment changed the committed runtime engine.
