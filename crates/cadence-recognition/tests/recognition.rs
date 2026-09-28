use cadence_recognition::{Engine, Profile};

fn chord(sample_rate: f32, notes: &[u8], duration: f32) -> Vec<f32> {
    (0..(sample_rate * duration) as usize)
        .map(|i| {
            let t = i as f32 / sample_rate;
            notes
                .iter()
                .map(|midi| {
                    let frequency = 440.0 * 2.0_f32.powf((*midi as f32 - 69.0) / 12.0);
                    let phase = std::f32::consts::TAU * frequency * t;
                    (phase.sin() + 0.22 * (phase * 2.0).sin() + 0.08 * (phase * 3.0).sin()) * 0.08
                })
                .sum::<f32>()
        })
        .collect()
}
fn feed(engine: &mut Engine, samples: &[f32]) -> usize {
    samples
        .chunks(2048)
        .filter(|frame| engine.process(frame).matched)
        .count()
}
#[test]
fn stable_match_and_repeat_require_new_attack() {
    for rate in [44100.0, 48000.0] {
        let mut engine = Engine::new(rate, Profile::Balanced).unwrap();
        engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
        let c = chord(rate, &[48, 52, 55, 60, 64], 0.8);
        assert_eq!(feed(&mut engine, &c), 1, "one success per arm");
        engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
        assert_eq!(
            feed(&mut engine, &c),
            0,
            "old sustain must not repeat-match"
        );
        feed(&mut engine, &vec![0.0; (rate * 0.15) as usize]);
        assert_eq!(feed(&mut engine, &c), 1, "release then strum rearms");
    }
}
#[test]
fn rejects_silence_wrong_chords_and_invalid_audio() {
    let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
    engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
    assert_eq!(feed(&mut engine, &vec![0.0; 48000]), 0);
    assert_eq!(
        feed(&mut engine, &chord(48000.0, &[45, 52, 57, 60, 64], 0.9)),
        0,
        "Am is not C"
    );
    assert_eq!(feed(&mut engine, &vec![f32::NAN; 8192]), 0);
    assert_eq!(feed(&mut engine, &vec![1.0; 8192]), 0);
    assert!(Engine::new(0.0, Profile::Balanced).is_err());
    assert!(engine.arm(0).is_err());
    assert!(engine.arm(1 << 13).is_err());
}
#[test]
fn reset_clears_pending_evidence() {
    let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
    engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
    feed(&mut engine, &chord(48000.0, &[48, 52, 55], 0.1));
    engine.reset();
    assert_eq!(
        feed(&mut engine, &chord(48000.0, &[48, 52, 55], 0.9)),
        0,
        "reset disarms"
    );
}
#[test]
fn common_guitar_chords_match() {
    let cases: &[(&[u8], u16)] = &[
        (&[40, 47, 52, 55, 59, 64], (1 << 4) | (1 << 7) | (1 << 11)),
        (&[43, 47, 50, 55, 59, 67], (1 << 7) | (1 << 11) | (1 << 2)),
        (&[41, 48, 53, 57, 60, 65], (1 << 5) | (1 << 9) | (1 << 0)),
        (&[45, 52, 57, 60, 64], (1 << 9) | (1 << 0) | (1 << 4)),
        (&[50, 57, 62, 66], (1 << 2) | (1 << 6) | (1 << 9)),
    ];
    for (notes, mask) in cases {
        let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
        engine.arm(*mask).unwrap();
        assert_eq!(
            feed(&mut engine, &chord(48000.0, notes, 0.9)),
            1,
            "notes {notes:?}"
        );
    }
}

#[test]
fn short_input_after_arm_cannot_reuse_old_spectral_evidence() {
    let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
    // Capture while disarmed must not count toward a newly selected target.
    let audio = chord(48000.0, &[48, 52, 55], 0.6);
    feed(&mut engine, &audio[..14336]);
    engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
    assert_eq!(feed(&mut engine, &audio[14336..26624]), 0);
}

#[test]
fn confusable_chords_and_deterministic_noise_are_rejected() {
    for notes in [&[48, 52, 55, 59][..], &[48, 51, 55][..], &[48, 53, 55][..]] {
        let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
        engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
        assert_eq!(
            feed(&mut engine, &chord(48000.0, notes, 1.0)),
            0,
            "wrong chord {notes:?}"
        );
    }
    let mut seed = 42_u32;
    let noise: Vec<f32> = (0..48000)
        .map(|_| {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            (seed as f32 / u32::MAX as f32 - 0.5) * 0.2
        })
        .collect();
    let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
    engine.arm(145).unwrap();
    assert_eq!(feed(&mut engine, &noise), 0);
}

#[test]
fn a_different_chord_does_not_require_a_silent_gap() {
    let mut engine = Engine::new(48000.0, Profile::Balanced).unwrap();
    engine.arm((1 << 0) | (1 << 4) | (1 << 7)).unwrap();
    assert_eq!(
        feed(&mut engine, &chord(48000.0, &[48, 52, 55, 60, 64], 0.8)),
        1
    );
    engine.arm((1 << 7) | (1 << 11) | (1 << 2)).unwrap();
    assert_eq!(
        feed(&mut engine, &chord(48000.0, &[48, 52, 55, 60, 64], 0.4)),
        0,
        "old C cannot confirm G"
    );
    assert_eq!(
        feed(&mut engine, &chord(48000.0, &[43, 47, 50, 55, 59, 67], 0.9)),
        1,
        "a new chord at similar volume must not wait for silence"
    );
}

#[test]
fn tablature_single_notes_match_exact_octave_once_per_attack() {
    let rate = 48000.0;
    let mut engine = Engine::new(rate, Profile::Balanced).unwrap();
    engine.arm_note(43).unwrap(); // low G on the sixth string
    assert_eq!(
        feed(&mut engine, &chord(rate, &[55], 0.7)),
        0,
        "wrong octave"
    );
    assert_eq!(feed(&mut engine, &vec![0.0; 8192]), 0);
    assert_eq!(feed(&mut engine, &chord(rate, &[43], 0.7)), 1);
    engine.arm_note(43).unwrap();
    assert_eq!(
        feed(&mut engine, &chord(rate, &[43], 0.4)),
        0,
        "sustain is not a second note"
    );
    feed(&mut engine, &vec![0.0; 8192]);
    assert_eq!(feed(&mut engine, &chord(rate, &[43], 0.7)), 1);
    engine.arm_note(88).unwrap();
    assert_eq!(feed(&mut engine, &chord(rate, &[88], 0.7)), 1, "high fret");
    engine.arm_note(38).unwrap();
    assert_eq!(
        feed(&mut engine, &chord(rate, &[38], 0.7)),
        1,
        "drop D open string"
    );
    assert!(engine.arm_note(20).is_err());
}

#[test]
fn tablature_two_note_targets_are_checked_in_rust() {
    let rate = 48000.0;
    let mut engine = Engine::new(rate, Profile::Balanced).unwrap();
    engine.arm_notes(&[50, 57]).unwrap();
    assert_eq!(feed(&mut engine, &chord(rate, &[50], 0.7)), 0);
    assert_eq!(feed(&mut engine, &vec![0.0; 8192]), 0);
    assert_eq!(
        feed(&mut engine, &chord(rate, &[62, 69], 0.9)),
        0,
        "wrong octaves"
    );
    feed(&mut engine, &vec![0.0; 8192]);
    assert_eq!(feed(&mut engine, &chord(rate, &[50, 57], 0.9)), 1);
    engine.arm_notes(&[62, 69]).unwrap();
    feed(&mut engine, &vec![0.0; 8192]);
    assert_eq!(
        feed(&mut engine, &chord(rate, &[50, 57], 0.9)),
        0,
        "lower octaves"
    );
}

#[test]
fn knocking_on_heavens_door_accompaniment_tab_advances_in_rust() {
    let rate = 48000.0;
    let mut engine = Engine::new(rate, Profile::Balanced).unwrap();
    // Original tab accompaniment exercise: G, D, Am, C, then repeat.
    let bars: &[&[u8]] = &[
        &[43, 47, 50, 55, 59, 67],
        &[50, 57, 62, 66],
        &[45, 52, 57, 60, 64],
        &[48, 52, 55, 60, 64],
    ];
    for notes in bars.iter().cycle().take(8) {
        engine.arm_notes(notes).unwrap();
        assert_eq!(
            feed(&mut engine, &chord(rate, notes, 0.8)),
            1,
            "notes {notes:?}"
        );
        feed(&mut engine, &vec![0.0; 8192]);
    }
}
