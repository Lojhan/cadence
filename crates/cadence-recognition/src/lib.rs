//! Target-aware chord confirmation. No clocks, browser APIs, or database dependencies.
pub use cadence_dsp::Detector;
use cadence_dsp::{Analyzer, Tuner, HOP};
#[derive(Clone, Copy)]
pub enum Profile {
    Gentle,
    Balanced,
    Precise,
}
#[derive(Default, Clone, Copy, Debug)]
pub struct Report {
    pub matched: bool,
    pub level: f32,
    pub score: f32,
    pub progress: f32,
    /// Offline evaluator only; absent from the default engine and WASM build.
    #[cfg(feature = "diagnostics")]
    pub chroma: Option<[f32; 12]>,
}
pub struct Engine {
    analyzer: Analyzer,
    tab_analyzer: Option<Analyzer>,
    tuner: Tuner,
    rate: f32,
    profile: Profile,
    target: u16,
    note_target: Option<u8>,
    tab_notes: Vec<u8>,
    confirmed: bool,
    needs_attack: bool,
    released: usize,
    stable: usize,
    previous_level: f32,
    previous_note_sublevel: f32,
}
impl Engine {
    pub fn new(rate: f32, profile: Profile) -> Result<Self, &'static str> {
        Self::with_detector(rate, profile, Detector::Whitened)
    }
    pub fn with_detector(
        rate: f32,
        profile: Profile,
        detector: Detector,
    ) -> Result<Self, &'static str> {
        if !rate.is_finite() || !(8000.0..=192000.0).contains(&rate) {
            return Err("Unsupported sample rate");
        }
        Ok(Self {
            analyzer: Analyzer::with_detector(rate, detector),
            tab_analyzer: None,
            tuner: Tuner::new(rate)?,
            rate,
            profile,
            target: 0,
            note_target: None,
            tab_notes: Vec::new(),
            confirmed: false,
            needs_attack: false,
            released: 0,
            stable: 0,
            previous_level: 0.0,
            previous_note_sublevel: 0.0,
        })
    }
    pub fn arm(&mut self, mask: u16) -> Result<(), &'static str> {
        if mask & !0xfff != 0 || mask.count_ones() < 3 {
            return Err("Invalid chord mask");
        }
        self.needs_attack = self.note_target.is_none()
            && self.tab_notes.is_empty()
            && mask == self.target
            && (self.needs_attack || self.confirmed);
        self.analyzer.clear();
        if let Some(analyzer) = &mut self.tab_analyzer {
            analyzer.clear();
        }
        self.tuner.reset();
        self.target = mask;
        self.note_target = None;
        self.tab_notes.clear();
        self.confirmed = false;
        self.stable = 0;
        Ok(())
    }
    pub fn arm_note(&mut self, midi: u8) -> Result<(), &'static str> {
        if !(36..=88).contains(&midi) {
            return Err("Tab note is outside supported guitar range");
        }
        self.needs_attack = self.note_target == Some(midi) && (self.needs_attack || self.confirmed);
        self.analyzer.clear();
        if let Some(analyzer) = &mut self.tab_analyzer {
            analyzer.clear();
        }
        self.tuner.reset();
        self.target = 0;
        self.note_target = Some(midi);
        self.tab_notes.clear();
        self.confirmed = false;
        self.stable = 0;
        Ok(())
    }
    pub fn arm_notes(&mut self, notes: &[u8]) -> Result<(), &'static str> {
        if !(2..=6).contains(&notes.len()) || notes.iter().any(|note| !(36..=88).contains(note)) {
            return Err("Invalid tab note group");
        }
        let mask = notes
            .iter()
            .fold(0_u16, |mask, note| mask | (1 << (note % 12)));
        self.needs_attack = self.tab_notes == notes && (self.needs_attack || self.confirmed);
        self.analyzer.clear();
        self.tab_analyzer
            .get_or_insert_with(|| Analyzer::for_tablature(self.rate))
            .clear();
        self.tuner.reset();
        self.target = mask;
        self.note_target = None;
        self.tab_notes = notes.to_vec();
        self.confirmed = false;
        self.stable = 0;
        Ok(())
    }
    pub fn reset(&mut self) {
        self.analyzer.clear();
        if let Some(analyzer) = &mut self.tab_analyzer {
            analyzer.clear();
        }
        self.tuner.reset();
        self.target = 0;
        self.note_target = None;
        self.tab_notes.clear();
        self.confirmed = false;
        self.needs_attack = false;
        self.released = 0;
        self.stable = 0;
        self.previous_level = 0.0;
        self.previous_note_sublevel = 0.0;
    }
    pub fn process(&mut self, samples: &[f32]) -> Report {
        let mut report = Report::default();
        if samples.is_empty() {
            return report;
        }
        if samples.iter().any(|s| !s.is_finite() || s.abs() >= 0.999) {
            self.analyzer.clear();
            if let Some(analyzer) = &mut self.tab_analyzer {
                analyzer.clear();
            }
            self.tuner.reset();
            self.stable = 0;
            return report;
        }
        report.level = (samples.iter().map(|x| x * x).sum::<f32>() / samples.len() as f32).sqrt();
        if report.level < 0.003 {
            self.released += samples.len();
            self.stable = 0;
            self.analyzer.clear();
            if let Some(analyzer) = &mut self.tab_analyzer {
                analyzer.clear();
            }
            self.tuner.reset();
            if self.released as f32 >= self.rate * 0.08 {
                self.needs_attack = false;
            }
            self.previous_level = report.level;
            self.previous_note_sublevel = report.level;
            return report;
        }
        if self.note_target.is_none()
            && self.needs_attack
            && report.level > self.previous_level.max(0.02) * 2.5
        {
            self.needs_attack = false;
            self.stable = 0;
            self.analyzer.clear();
            if let Some(analyzer) = &mut self.tab_analyzer {
                analyzer.clear();
            }
            self.tuner.reset();
        }
        self.previous_level = report.level;
        self.released = 0;
        let (minimum, hold) = match self.profile {
            Profile::Gentle => (0.78, 0.12),
            Profile::Balanced => (0.82, 0.18),
            Profile::Precise => (0.92, 0.25),
        };
        if let Some(note) = self.note_target {
            // Follow short subframes even while the last note is confirmed.
            // A new pluck can begin inside a 2048-sample worklet block, and a
            // whole-block RMS can hide it under the previous note's sustain.
            let mut new_attack_at = None;
            for (index, frame) in samples.chunks(1024).enumerate() {
                let level = (frame.iter().map(|x| x * x).sum::<f32>() / frame.len() as f32).sqrt();
                if self.needs_attack
                    && new_attack_at.is_none()
                    && level > self.previous_note_sublevel.max(0.015) * 1.7
                    && level >= 0.025
                {
                    new_attack_at = Some(index * 1024);
                }
                self.previous_note_sublevel = level;
            }
            if new_attack_at.is_some() {
                self.needs_attack = false;
                self.stable = 0;
                self.tuner.reset();
            }
            let analyzed = self.tuner.process(&samples[new_attack_at.unwrap_or(0)..]);
            if self.confirmed || self.needs_attack {
                return report;
            }
            let expected = 440.0 * 2.0_f32.powf((f32::from(note) - 69.0) / 12.0);
            let correct = analyzed
                && self.tuner.candidate_reading().is_some_and(|reading| {
                    let cents = (1200.0 * (reading.frequency / expected).log2()).abs();
                    let third_cents =
                        (1200.0 * (reading.frequency / (expected * 3.0)).log2()).abs();
                    let lower_third_cents =
                        (1200.0 * (reading.frequency * 3.0 / expected).log2()).abs();
                    let lower_series = (cents <= 35.0 || third_cents <= 35.0)
                        && self.tuner.has_lower_third_harmonics(reading.frequency);
                    reading.confidence >= 0.8
                        && ((cents <= 35.0 && !lower_series)
                            || (third_cents <= 35.0 && lower_series)
                            || (lower_third_cents <= 35.0
                                && self.tuner.has_upper_harmonics(expected)))
                });
            report.score = if correct { 1.0 } else { 0.0 };
            report.progress = if correct { 1.0 } else { 0.0 };
            if correct {
                self.confirmed = true;
                report.matched = true;
            }
            return report;
        }
        for sample in samples {
            let Some(chroma) = (if self.tab_notes.is_empty() {
                self.analyzer.push(*sample)
            } else {
                self.tab_analyzer
                    .as_mut()
                    .and_then(|analyzer| analyzer.push(*sample))
            }) else {
                continue;
            };
            #[cfg(feature = "diagnostics")]
            {
                report.chroma = Some(chroma);
            }
            if self.target == 0 || self.confirmed || self.needs_attack {
                continue;
            }
            if !self.tab_notes.is_empty() {
                let Some(analyzer) = &self.tab_analyzer else {
                    continue;
                };
                let Some(detected) = analyzer.notes() else {
                    continue;
                };
                let peak = analyzer.peak_energy();
                let fundamentals = self
                    .tab_notes
                    .iter()
                    .all(|note| analyzer.fundamental_energy(*note) > peak * 0.035);
                let total: f32 = chroma.iter().sum();
                let inside: f32 = chroma
                    .iter()
                    .enumerate()
                    .filter(|(pitch_class, _)| self.target & (1 << pitch_class) != 0)
                    .map(|(_, energy)| energy)
                    .sum();
                let wrong_octave = detected.iter().enumerate().any(|(midi, energy)| {
                    *energy > 0.0
                        && self.target & (1 << (midi % 12)) != 0
                        && !self.tab_notes.contains(&(midi as u8))
                        && analyzer.fundamental_energy(midi as u8) > peak * 0.2
                });
                report.score = if total > 0.0 { inside / total } else { 0.0 };
                if fundamentals && !wrong_octave && report.score >= minimum - 0.08 {
                    self.stable += HOP;
                } else {
                    self.stable = 0;
                }
                report.progress = (self.stable as f32 / (self.rate * hold)).min(1.0);
                if report.progress >= 1.0 {
                    self.confirmed = true;
                    report.matched = true;
                }
                continue;
            }
            let total: f32 = chroma.iter().sum();
            let maximum = chroma.iter().copied().fold(0.0_f32, f32::max);
            let mut inside = 0.0;
            let mut covered = true;
            let mut weakest_inside = f32::INFINITY;
            let mut strongest_outside = 0.0_f32;
            for (note, energy) in chroma.iter().enumerate() {
                if self.target & (1 << note) != 0 {
                    inside += energy;
                    weakest_inside = weakest_inside.min(*energy);
                    covered &= *energy > maximum * 0.04;
                } else {
                    strongest_outside = strongest_outside.max(*energy);
                }
            }
            // A strong root/fifth must not hide the wrong third. Every target
            // class must dominate any unexplained class before evidence counts.
            covered &= weakest_inside > strongest_outside;
            report.score = if total > 0.0 { inside / total } else { 0.0 };
            if covered && report.score >= minimum {
                self.stable += HOP;
            } else if covered && report.score >= minimum - 0.1 {
                self.stable = self.stable.saturating_sub(HOP / 4);
            } else {
                self.stable = 0;
            }
            report.progress = (self.stable as f32 / (self.rate * hold)).min(1.0);
            if report.progress >= 1.0 {
                self.confirmed = true;
                report.matched = true;
            }
        }
        report
    }
}
