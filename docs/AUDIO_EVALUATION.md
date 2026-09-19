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
sounding invalidates the attempt. The labeled window ends at a later foreign-note
onset or when any required pitch class stops sounding after the attack, whichever
comes first. Overlapping notes in the same pitch class, including different
octaves, can extend coverage; a later reattack cannot bridge a gap. Require at
least 500 ms before that boundary. This prevents a released chord tone or a
later chord change from being scored against an earlier complete-chord label. Selection is independent
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

## Current calibration result: continuous note coverage

The earlier selector required every target class to sound at 400 ms, but could
continue scoring after a required note ended. For example, releasing a seventh
could cause a later triad match to be counted against the earlier seventh-chord
label. The current rule stops at the first loss of continuous pitch-class coverage.
It uses annotations alone and applies the identical interval to all targets.

This reduces the calibration subset from 233 to 116 positive strums and from
1,313 to 656 related negative targets. There are no newly included cases; 117
previous positives no longer have a qualifying window, and six retained cases
start at a later qualifying strum. These are different scoring windows, so the
new numbers must not be presented as an improvement in the unchanged engine.

| Profile | Correct strums recognized | Wrong targets accepted | Matched-case p95 |
| --- | --- | --- | --- |
| Gentle | 102 / 116 (87.9%) | 18 / 656 (2.7%) | 372 ms |
| Balanced | 97 / 116 (83.6%) | 10 / 656 (1.5%) | 511 ms |
| Precise | 72 / 116 (62.1%) | 2 / 656 (0.3%) | 557 ms |

[The current report](evaluation/guitarset-release-boundaries.json) records source
checksums, every prior positive's retained/changed/excluded interval, confusion
matrices and all failed cases. The original broad and historical subset reports
remain available below. This narrower subset does not establish recognition of
short strums, other instruments, or realistic practice false-advance rates.
No profile meets all release targets, and held-out audio remains unevaluated.

## Historical calibration result

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


## Historical expanded confusion checks

The table below uses the previous window rule, before note-release boundaries
were enforced. Running these commands now produces the corrected subset above.

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


## Native and WASM corpus parity

The offline WASM runner decodes the same WAV intervals and feeds 2,048-sample
blocks into the generated Rust engine. It contains no JavaScript recognition
implementation. PCM8/16/24/32 and float32 decoding, including mono averaging,
are covered by Poku.

```sh
pnpm --silent eval:wasm artifacts/guitarset/calibration-confusions.json balanced > artifacts/guitarset/calibration-confusions-wasm-report.json
CADENCE_AUDIO_MANIFEST=artifacts/guitarset/calibration-confusions.json pnpm test:audio-parity
```

Poku originally compared all 1,546 calibration cases across Gentle, Balanced and
Precise: all 4,638 match decisions and sample-based latencies agreed exactly with
the optimized native evaluator. After correcting note-release boundaries, it
repeated the comparison on all 772 current cases across three profiles: all
2,316 decisions and latencies agree exactly. The normal test suite runs the same comparison
on the checked-in recording fixtures; the complete dataset remains an optional
local input because its audio is separately licensed.

This establishes runtime parity, not improved recognition accuracy. Node's
offline WASM processing measurements exclude microphone capture, browser
scheduling and device latency. Held-out recordings remain unevaluated.

## Rejected adjacent-partial correction

A calibration experiment estimated third-harmonic energy from the geometric mean
of adjacent second and fourth partials, restricted to fundamentals at or above
120 Hz. On the current continuous-coverage subset it preserved every previous
correct decision: Gentle false matches decreased from 18 to 16, Balanced from
10 to 9, and Precise positive matches increased from 72 to 77.

The broader Balanced check nevertheless lost two previously recognized examples:
`01_BN3-119-G_comp:9:correct` (D) and
`03_Jazz2-110-Bb_comp:9:correct` (C#maj7). Three other positives became matches,
so the aggregate improved from 557 to 558 of 889 while concealing these losses.
False matches stayed at 5 of 676. Broad labels include incomplete playing, but
these losses have not been established as harmless; the candidate was rejected.

[The comparison](evaluation/guitarset-adaptive-third-rejected.json) preserves
manifest hashes, summaries and every changed decision. The accompanying
[experimental patch](evaluation/guitarset-adaptive-third-rejected.patch) records
the rejected implementation; it is not applied to the runtime. A temporary
A-major/Amaj7 excerpt regression reproduced one improvement, and all 25 test
suites passed with the candidate, demonstrating why the broader evaluation is
necessary. The temporary fixture was removed with the rejected change.
Held-out recordings were not evaluated, and the current engine is unchanged.

## Rejected tone-evidence experiments

A focused Poku regression reproduced `03_SS3-98-C_comp:3`: the performed Em
matches both Em and the incorrect Em7 target. Two hypotheses were evaluated on
all 772 current calibration comparisons; neither fixed that focused error.

| Balanced candidate | Correct strums | Wrong targets | Matched p95 |
| --- | --- | --- | --- |
| Unchanged baseline | 97/116 | 10/656 | 511 ms |
| Raise minimum per-tone chroma from 4% to 6% of maximum | 96/116 | 7/656 | 511 ms |
| Weight peaks by proximity to the nearest semitone | 98/116 | 13/656 | 464 ms |

The higher floor loses the previously recognized `01_SS1-68-E_comp:1:correct`.
The tuning weight recovers one valid G but introduces five new wrong-target
matches while removing two others. Both candidates are rejected; improved aggregate
latency or fewer false matches alone does not justify these regressions. Broader
and held-out evaluation was not run for candidates that already failed this check.

[The comparison](evaluation/guitarset-tone-evidence-rejected.json) records the
source and manifest hashes, summaries, and every changed decision. The
[tone-floor patch](evaluation/guitarset-tone-floor-006-rejected.patch) and
[tuning-weight patch](evaluation/guitarset-tuning-weight-rejected.patch) preserve
the experiments without applying them to the runtime. Restoring the engine
reproduced the complete baseline report exactly. The next investigation must
inspect the spurious pitch-class evidence rather than treating these two simple
threshold/weighting changes as solutions. Held-out players remain untouched.

## Offline feature traces

To inspect one calibration failure using the exact engine features:

```sh
pnpm --silent eval:audio artifacts/guitarset/calibration-confusions.json balanced --trace-case 03_SS3-98-C_comp:3:target-Em7 > artifacts/guitarset/em7-trace.json
```

The normal report remains unchanged; the optional `trace` includes feature frames
for the requested case up to its first match (or interval end). Each frame contains
its relative sample end/time, input RMS level, score, confirmation progress, match
flag and 12 raw chroma energies ordered C, C#, D, D#, E, F, F#, G, G#, A, A#, B.
Timestamps are reporting block boundaries, not physical microphone latency. Cases
without a complete analysis window have no feature frames. Unknown case IDs fail.

The evaluator enables a Rust `diagnostics` feature. Default recognition and the
WASM dependency build do not enable it; the application has no trace endpoint or
recording feature. This reads existing offline WAV fixtures and does not capture,
log or upload microphone PCM.

The [Em/Em7 trace](evaluation/guitarset-em7-feature-trace.json) records dataset
attribution, audio/manifest hashes and the exact calibration interval. In this
case the D evidence rises to about 9% of the strongest class at the 279 ms
frame, then rises to about 17% by the false match at 418 ms. The evidence is too
large for the rejected 6% floor to remove. This trace identifies the unexplained
class and its timing; it does not yet establish which spectral partial caused it.

Poku verifies trace output against a known C/E/G signal, unchanged decisions and
latency with tracing, frame ordering, and invalid-case rejection. With diagnostics
enabled, the full 772-case native report exactly matches the unchanged baseline.

Full native/WASM parity also passes: all 772 calibration cases across three
profiles agree in decision and latency (2,316 comparisons).

## Rejected temporal harmonic estimates

The focused Em diagnostic has a persistent spectral peak near 592 Hz. Across the
last five analyzed frames its raw magnitude falls only from about 112 to 96,
while the existing harmonic subtraction falls from about 106 to zero. Its residual
therefore grows into D chroma. This is evidence of a changing estimate, not proof
that carrying the estimate forward is safe for every chord.

A candidate retained strongly explained harmonic energy with a 0.8-second decay,
cleared it on a 1.5× peak increase, and reset it with the analyzer. Replacing the
original chroma fixed three wrong-target matches but introduced three others.
A second version kept the original score/coverage checks and used the retained
estimate only as an additional target-tone veto, preventing those new accepts.

| 0.8 s veto | Correct baseline → candidate | Wrong baseline → candidate |
| --- | --- | --- |
| Clean Balanced | 97 → 97 / 116 | 10 → 7 / 656 |
| Clean Gentle | 102 → 101 / 116 | 18 → 16 / 656 |
| Clean Precise | 72 → 72 / 116 | 2 → 1 / 656 |
| Broad Balanced | 557 → 554 / 889 | 5 → 5 / 676 |

The veto passes the focused Em/Em7 regression but loses valid broader cases:
`03_BN3-119-G_comp:8:correct`, `03_Jazz2-110-Bb_comp:9:correct`, and
`03_SS3-84-Bb_comp:10:correct`. Shortening retention to 0.6 seconds still loses
those cases and the Gentle positive, while fixing fewer false matches. Both veto
variants and the replacement are rejected; the runtime is unchanged. The restored
engine reproduces every baseline decision and latency. Held-out players were not
inspected.

[Detailed results and peak measurements](evaluation/guitarset-temporal-harmonics-rejected.json)
include source/manifest hashes and all changed decisions. Experimental patches:
[replacement](evaluation/guitarset-temporal-replacement-080-rejected.patch),
[0.8-second veto](evaluation/guitarset-temporal-veto-080-rejected.patch), and
[0.6-second veto](evaluation/guitarset-temporal-veto-060-rejected.patch).
The next model must distinguish valid overlapping chord tones from harmonics;
retaining subtraction estimates alone does not achieve that.

A research candidate for the next spike is approximate note decomposition before
folding into chroma. [Mauch and Dixon (ISMIR 2010)](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2010/Mauch-Dixon-ISMIR-2010.pdf)
evaluate non-negative least-squares note activation specifically to reduce
fundamental/partial confusion in difficult chords. Their dataset and metrics are
not Cadence's release evidence; any implementation needs our own bounded-memory,
latency, calibration and regression checks before adoption.
