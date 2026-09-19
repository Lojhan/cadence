use cadence_dsp::{Analyzer, Detector, WINDOW};

fn features(notes: &[u8], harmonics: &[f32], gain: f32, cents: f32, rate: f32) -> [f32; 12] {
    let mut analyzer = Analyzer::with_detector(rate, Detector::Whitened);
    let mut result = [0.0; 12];
    for i in 0..WINDOW * 2 {
        let sample = notes
            .iter()
            .map(|note| {
                let f = 440.0 * 2.0_f32.powf((*note as f32 - 69.0 + cents / 100.0) / 12.0);
                harmonics
                    .iter()
                    .enumerate()
                    .map(|(h, a)| {
                        a * (std::f32::consts::TAU * f * (h + 1) as f32 * i as f32 / rate).sin()
                    })
                    .sum::<f32>()
            })
            .sum::<f32>()
            * gain;
        if let Some(frame) = analyzer.push(sample) {
            result = frame;
        }
    }
    result
}
fn covers(chroma: [f32; 12], notes: &[usize]) {
    let max = chroma.iter().copied().fold(0.0_f32, f32::max);
    for note in notes {
        assert!(chroma[*note] > max * 0.04, "missing {note}: {chroma:?}");
    }
    let weakest = notes
        .iter()
        .map(|n| chroma[*n])
        .fold(f32::INFINITY, f32::min);
    for (note, energy) in chroma.iter().enumerate() {
        if !notes.contains(&note) {
            assert!(*energy < weakest, "invented {note}: {chroma:?}");
        }
    }
}
#[test]
fn weak_fundamentals_and_shared_harmonics_preserve_the_chord() {
    for rate in [44100.0, 48000.0] {
        for cents in [-25.0, 0.0, 25.0] {
            covers(
                features(
                    &[48, 52, 55, 60, 64],
                    &[0.25, 1.0, 0.8, 0.4, 0.2],
                    0.03,
                    cents,
                    rate,
                ),
                &[0, 4, 7],
            );
        }
    }
}
#[test]
fn odd_partials_do_not_invent_a_seventh_but_a_played_seventh_survives() {
    covers(
        features(
            &[40, 47, 52, 55, 59, 64],
            &[1.0, 0.4, 1.2, 0.2, 0.15],
            0.025,
            0.0,
            48000.0,
        ),
        &[4, 7, 11],
    );
    covers(
        features(
            &[40, 47, 50, 55, 59, 64],
            &[1.0, 0.4, 1.2, 0.2, 0.15],
            0.025,
            0.0,
            48000.0,
        ),
        &[2, 4, 7, 11],
    );
}
#[test]
fn whitening_is_gain_invariant_and_silence_is_finite() {
    let a = features(&[48, 52, 55], &[1.0, 0.3, 0.2], 0.1, 0.0, 48000.0);
    let b = features(&[48, 52, 55], &[1.0, 0.3, 0.2], 0.001, 0.0, 48000.0);
    let sa: f32 = a.iter().sum();
    let sb: f32 = b.iter().sum();
    assert!(sa > 0.0 && sb > 0.0);
    for i in 0..12 {
        assert!((a[i] / sa - b[i] / sb).abs() < 0.01);
    }
    assert_eq!(features(&[], &[], 0.0, 0.0, 48000.0), [0.0; 12]);
}

#[test]
fn fundamental_only_open_chords_preserve_all_classes() {
    covers(
        features(&[48, 52, 55, 60, 64], &[1.0], 0.08, 0.0, 48000.0),
        &[0, 4, 7],
    );
    covers(
        features(&[43, 47, 50, 55, 59, 67], &[1.0], 0.08, 0.0, 48000.0),
        &[2, 7, 11],
    );
}
