use cadence_dsp::Tuner;

fn feed(tuner: &mut Tuner, rate: f32, hz: f32, blocks: usize) {
    for block in 0..blocks {
        let pcm: Vec<f32> = (0..2048)
            .map(|i| {
                let time = (block * 2048 + i) as f32 / rate;
                0.12 * (std::f32::consts::TAU * hz * time).sin()
            })
            .collect();
        tuner.process(&pcm);
    }
}

#[test]
fn stable_pitch_requires_contiguous_agreeing_audio() {
    let mut tuner = Tuner::new(48_000.0).unwrap();
    feed(&mut tuner, 48_000.0, 110.0, 2);
    assert!(
        tuner.reading().is_none(),
        "first estimate must not flash a note"
    );
    feed(&mut tuner, 48_000.0, 110.0, 5);
    let reading = tuner.reading().expect("stable A2");
    assert!((reading.frequency - 110.0).abs() < 1.0);
    assert!(reading.confidence > 0.7);
}

#[test]
fn transient_wrong_note_does_not_replace_stable_note_or_trigger_warning() {
    let mut tuner = Tuner::new(48_000.0).unwrap();
    feed(&mut tuner, 48_000.0, 110.0, 8);
    let before = tuner.reading().unwrap().frequency;
    feed(&mut tuner, 48_000.0, 146.83, 1);
    assert!((tuner.reading().unwrap().frequency - before).abs() < 2.0);
    feed(&mut tuner, 48_000.0, 110.0, 5);
    assert!((tuner.reading().unwrap().frequency - 110.0).abs() < 2.0);
}

#[test]
fn silence_clears_stale_reading_after_a_short_hold() {
    let mut tuner = Tuner::new(48_000.0).unwrap();
    feed(&mut tuner, 48_000.0, 82.41, 8);
    assert!(tuner.reading().is_some());
    for _ in 0..5 {
        tuner.process(&[0.0; 2048]);
    }
    assert!(tuner.reading().is_none());
}

#[test]
fn harmonic_rich_pluck_tracks_weak_fundamental() {
    let rate = 48_000.0;
    let hz = 82.4069;
    let mut tuner = Tuner::new(rate).unwrap();
    for block in 0..9 {
        let pcm: Vec<f32> = (0..2048)
            .map(|i| {
                let time = (block * 2048 + i) as f32 / rate;
                let decay = (-time * 2.0).exp();
                decay
                    * (0.025 * (std::f32::consts::TAU * hz * time).sin()
                        + 0.09 * (std::f32::consts::TAU * hz * 2.0 * time).sin()
                        + 0.045 * (std::f32::consts::TAU * hz * 3.0 * time).sin())
            })
            .collect();
        tuner.process(&pcm);
    }
    let reading = tuner.reading().expect("stable low E");
    assert!(
        (reading.frequency - hz).abs() < 1.0,
        "got {} Hz",
        reading.frequency
    );
}
