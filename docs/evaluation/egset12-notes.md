# EGSet12 note recognition probe

This is a small engineering replay of solo electric guitar, not a held-out
accuracy estimate. The recording selection and original alpha.24 outcomes were
frozen before changing the note recognizer. The nine intervals and official MD5
checksums are in [`egset12-note-cases.json`](egset12-note-cases.json). EGSet12 is
CC BY 4.0 and is not bundled with Cadence.

Download `01.wav` and `02.wav` from the [EGSet12 v1 record](https://zenodo.org/records/11406378)
into ignored `artifacts/egset12/`, then run:

```sh
pnpm build:wasm
pnpm exec tsx tooling/evaluate-egset12-notes.ts artifacts/egset12 > artifacts/egset12/note-report.json
```

The evaluator refuses files whose MD5 differs from the official record. It
feeds the production WASM engine at the WAV's original sample rate in
2,048-sample blocks. Each isolated interval is armed independently against its
annotated MIDI note and all 52 other supported guitar notes (36–88). The rapid
sequence feeds continuous `02.wav` audio and arms each next target immediately
after a match, as practice does. A match is timely only if its reporting block
ends by the annotated note release.

| Probe | Alpha.24 | Candidate |
| --- | ---: | ---: |
| Isolated notes matched before release | 1/9 | 9/9 |
| Wrong targets accepted on isolated intervals | not scanned | 0/468 |
| Rapid sequence targets matched in order | not measured with immediate arming | 8/8 |
| Rapid matches by annotated release | not measured with immediate arming | 7/8 |

The second rapid E2 match was reported at 426.7 ms, 3.7 ms after its annotated
423 ms release. This timing is quantized to a 2,048-sample block and excludes
microphone, worklet, worker, UI, and hardware delay. The prior probe that armed
targets at each annotation onset rather than immediately after a match found no
short note matched by release; that different rearm rule is not directly
comparable to the rapid sequence above.

The candidate reads two fresh agreeing pitch analyses for note progress instead
of the tuner's held display pitch plus a separate 180 ms hold. Short subframes
detect a new pluck while the previous note sustains. A target-aware harmonic
series check distinguishes a weak low fundamental from its strong third overtone
and checks for a genuine high note's upper harmonics when a lower string rings.
The display tuner and chord recognizer retain their prior confirmation rules.

Synthetic tests cover E2/G2 at 44.1 and 48 kHz, harmonic-rich E2 versus B3,
true B3 with a weak or absent fundamental and an E2 ring, repeated plucks, and
wrong octaves. A recorded sustained F2 mixed with digital metronome clicks at
amplitudes 0, 0.03, 0.075, and 0.12 matched once per arm. Digital mixing does
not represent calibrated speaker-to-microphone bleed.

The 0/468 wrong-target result and the harmonic thresholds were checked after
development on the same small recordings. They are regression diagnostics,
not independent validation. Broader instrument, room, device, background,
different-note, and held-out player tests remain necessary before a stable
accuracy or latency claim. In particular, physical guitar and device checks
have not been run.
