# Detection research — September 2026

## Decision

The causal spectral-whitening and multi-pitch estimator is now independently
implemented in Rust and selected for alpha.7 after improving both focused and broad
calibration results. See the implementation and measured trade-offs in
[AUDIO_EVALUATION.md](AUDIO_EVALUATION.md#whitened-multi-pitch-detector-alpha7). The current failures and rejected experiments remain in
[AUDIO_EVALUATION.md](AUDIO_EVALUATION.md).

The existing detector folds peaks into twelve chroma bins early. Preserving
individual pitches longer should help distinguish played notes from overlapping
harmonics. This is a hypothesis, not an established accuracy improvement.

## Candidates

| Priority | Method | Reason and limitation |
| --- | --- | --- |
| 1 | Spectral whitening plus iterative/joint multi-F0 | Small causal DSP candidate using our FFT infrastructure; controls timbre and competing harmonics. Requires full-corpus validation. |
| 2 | Guitar-specific harmonic-CQT neural model with note and onset heads | Learns harmonic structure; onset evidence may help repeated strums. Needs training, export parity and device benchmarks. |
| 3 | Basic Pitch as an offline comparator | Permissive implementation and models, but default inference has substantial context and is not a low-latency drop-in. |
| 4 | Complete log-frequency NNLS-chroma preprocessing | Different from our rejected raw-spectrum fixed/empirical dictionaries; requires an independent implementation compatible with MIT. |

[Klapuri 2006](https://archives.ismir.net/ismir2006/paper/000125.pdf) flattens the
spectral envelope, scores candidate fundamentals using harmonic support, and
accounts for competing notes through iterative cancellation or joint estimation.
A trailing-frame adaptation can avoid future audio. Its actual CPU and accuracy
on Cadence recordings must be measured.

[FretNet](https://arxiv.org/html/2212.03023) uses harmonic CQT features and separate
activity, onset and pitch-deviation heads. Its nine-frame context at a 512-sample
hop and 22,050 Hz spans about 186 ms. That is not end-to-end latency: CQT support,
context placement, compute and confirmation add costs. The
[authors' code](https://github.com/cwitkowitz/guitar-transcription-continuous) is
MIT. Cadence only needs pitch activity and onset estimates, not tablature output.
Checkpoint rights and training membership must also be checked before adoption.

[Spotify Basic Pitch](https://github.com/spotify/basic-pitch) is Apache-2.0, with a
[TypeScript implementation](https://github.com/spotify/basic-pitch-ts). Its
[constants](https://github.com/spotify/basic-pitch/blob/main/basic_pitch/constants.py)
use approximately two-second input windows. Its
[normalization](https://github.com/spotify/basic-pitch/blob/main/basic_pitch/layers/signal.py)
uses the whole time-frequency input, and its
[network](https://github.com/spotify/basic-pitch/blob/main/basic_pitch/models.py)
has centered convolutions. Rolling or right-padded inputs change model behavior;
faster-than-real-time throughput does not establish low causal latency.

Both neural families use GuitarSet in research/training. Unverified pretrained
weights cannot provide independent held-out evidence on our players 04/05.
Establish exact membership, train on allowed data, or use a separate corpus.

[Tract](https://github.com/sonos/tract) supports Rust inference, ONNX/NNEF and
browser WASM under MIT/Apache-2.0. It is a candidate runtime, not a verified
compatible exporter/runtime for either model. Start with CPU WASM and compare
outputs against the training implementation before assessing speed.

[NNLS-chroma](https://github.com/c4dm/nnls-chroma) includes tuning, log-frequency
features and spectral whitening. Its GPL-2.0-or-later source must not simply be
translated into the MIT core. An independent implementation from the
[paper](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2010/Mauch-Dixon-ISMIR-2010.pdf)
is the appropriate route. Our rejected raw-spectrum NNLS did not reproduce that
complete pipeline. [Essentia](https://essentia.upf.edu/documentation.html), licensed
AGPLv3 or commercially, is also a reference rather than a dependency to import.

## Bounded next experiment

1. Add a diagnostic-only feature source; production recognition stays unchanged.
2. Use trailing FFT frames, a bounded whitening floor, and pitch candidates across
   the guitar range. Infer at most six notes independently of the expected chord.
3. Write Poku-driven Rust tests for weak fundamentals, strong odd partials, real
   versus spurious sevenths, shared harmonics, silence/noise, detuning, gain
   scaling and repeated strums before implementing the estimator.
4. Evaluate all 772 calibration comparisons at every sensitivity, then the broad
   accompaniment set. Publish every changed decision, positive losses and new
   false matches alongside aggregate results.
5. Measure computation, allocations, memory and lookahead separately from
   matched-case sample latency. A shorter sample latency is not evidence of
   lower processing cost.
6. Consider runtime adoption only after meaningful corpus improvement without
   concealed regressions; require native/WASM parity and iPhone/iPad Safari
   benchmarks. Freeze selection before evaluating players 04/05.

This research does not resolve the physical Safari input-level report. Input
capture/gain and recognition accuracy remain separate validation gates.
