//! Target-aware chord confirmation. No clocks, browser APIs, or database dependencies.
use cadence_dsp::{Analyzer, HOP};
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
    rate: f32,
    profile: Profile,
    target: u16,
    confirmed: bool,
    needs_attack: bool,
    released: usize,
    stable: usize,
    previous_level: f32,
}
impl Engine {
    pub fn new(rate: f32, profile: Profile) -> Result<Self, &'static str> {
        if !rate.is_finite() || !(8000.0..=192000.0).contains(&rate) {
            return Err("Unsupported sample rate");
        }
        Ok(Self {
            analyzer: Analyzer::new(rate),
            rate,
            profile,
            target: 0,
            confirmed: false,
            needs_attack: false,
            released: 0,
            stable: 0,
            previous_level: 0.0,
        })
    }
    pub fn arm(&mut self, mask: u16) -> Result<(), &'static str> {
        if mask & !0xfff != 0 || mask.count_ones() < 3 {
            return Err("Invalid chord mask");
        }
        self.needs_attack = mask == self.target && (self.needs_attack || self.confirmed);
        self.analyzer.clear();
        self.target = mask;
        self.confirmed = false;
        self.stable = 0;
        Ok(())
    }
    pub fn reset(&mut self) {
        self.analyzer.clear();
        self.target = 0;
        self.confirmed = false;
        self.needs_attack = false;
        self.released = 0;
        self.stable = 0;
        self.previous_level = 0.0;
    }
    pub fn process(&mut self, samples: &[f32]) -> Report {
        let mut report = Report::default();
        if samples.is_empty() {
            return report;
        }
        if samples.iter().any(|s| !s.is_finite() || s.abs() >= 0.999) {
            self.analyzer.clear();
            self.stable = 0;
            return report;
        }
        report.level = (samples.iter().map(|x| x * x).sum::<f32>() / samples.len() as f32).sqrt();
        if report.level < 0.003 {
            self.released += samples.len();
            self.stable = 0;
            self.analyzer.clear();
            if self.released as f32 >= self.rate * 0.08 {
                self.needs_attack = false;
            }
            self.previous_level = report.level;
            return report;
        }
        if self.needs_attack && report.level > self.previous_level.max(0.02) * 2.5 {
            self.needs_attack = false;
            self.stable = 0;
            self.analyzer.clear();
        }
        self.previous_level = report.level;
        self.released = 0;
        let (minimum, hold) = match self.profile {
            Profile::Gentle => (0.78, 0.12),
            Profile::Balanced => (0.82, 0.18),
            Profile::Precise => (0.92, 0.25),
        };
        for sample in samples {
            let Some(chroma) = self.analyzer.push(*sample) else {
                continue;
            };
            #[cfg(feature = "diagnostics")]
            {
                report.chroma = Some(chroma);
            }
            if self.target == 0 || self.confirmed || self.needs_attack {
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
