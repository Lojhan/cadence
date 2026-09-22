//! Monophonic guitar pitch tracking. All time thresholds are counted in samples.
const WINDOW: usize = 4096;
const HOP: usize = 2048;
const MIN_HZ: f32 = 60.0;
const MAX_HZ: f32 = 500.0;
const MIN_RMS: f32 = 0.006;
const MIN_CONFIDENCE: f32 = 0.68;
const AGREEMENT_CENTS: f32 = 30.0;

#[derive(Clone, Copy, Debug)]
pub struct TunerReading {
    pub frequency: f32,
    pub confidence: f32,
}

pub struct Tuner {
    rate: f32,
    ring: [f32; WINDOW],
    ordered: [f32; WINDOW],
    nsdf: Vec<f32>,
    cursor: usize,
    filled: usize,
    since_analysis: usize,
    candidate: Option<TunerReading>,
    agreements: u8,
    reading: Option<TunerReading>,
    missed_samples: usize,
}

impl Tuner {
    pub fn new(rate: f32) -> Result<Self, &'static str> {
        if !rate.is_finite() || !(8_000.0..=192_000.0).contains(&rate) {
            return Err("Unsupported sample rate");
        }
        Ok(Self {
            rate,
            ring: [0.0; WINDOW],
            ordered: [0.0; WINDOW],
            nsdf: vec![0.0; WINDOW],
            cursor: 0,
            filled: 0,
            since_analysis: 0,
            candidate: None,
            agreements: 0,
            reading: None,
            missed_samples: 0,
        })
    }

    pub fn reset(&mut self) {
        self.ring.fill(0.0);
        self.cursor = 0;
        self.filled = 0;
        self.since_analysis = 0;
        self.candidate = None;
        self.agreements = 0;
        self.reading = None;
        self.missed_samples = 0;
    }

    /// Returns true when a new analysis was performed; `reading` may be absent.
    pub fn process(&mut self, samples: &[f32]) -> bool {
        let mut analyzed = false;
        for &sample in samples {
            self.ring[self.cursor] = if sample.is_finite() { sample } else { 0.0 };
            self.cursor = (self.cursor + 1) % WINDOW;
            self.filled = (self.filled + 1).min(WINDOW);
            self.since_analysis += 1;
            if self.filled < WINDOW || self.since_analysis < HOP {
                continue;
            }
            self.since_analysis = 0;
            self.analyze();
            analyzed = true;
        }
        analyzed
    }

    pub fn reading(&self) -> Option<TunerReading> {
        self.reading
    }

    fn analyze(&mut self) {
        for (index, value) in self.ordered.iter_mut().enumerate() {
            *value = self.ring[(self.cursor + index) % WINDOW];
        }
        let estimate = estimate(&self.ordered, self.rate, &mut self.nsdf);
        match estimate {
            Some(next) => {
                self.missed_samples = 0;
                let agrees = self.candidate.is_some_and(|previous| {
                    (1200.0 * (next.frequency / previous.frequency).log2()).abs() <= AGREEMENT_CENTS
                });
                self.agreements = if agrees {
                    self.agreements.saturating_add(1)
                } else {
                    1
                };
                self.candidate = Some(next);
                if self.agreements >= 3 {
                    self.reading = Some(next);
                }
            }
            None => {
                self.candidate = None;
                self.agreements = 0;
                self.missed_samples += HOP;
                if self.missed_samples >= (self.rate * 0.12) as usize {
                    self.reading = None;
                }
            }
        }
    }
}

fn estimate(samples: &[f32; WINDOW], rate: f32, nsdf: &mut [f32]) -> Option<TunerReading> {
    let rms = (samples.iter().map(|sample| sample * sample).sum::<f32>() / WINDOW as f32).sqrt();
    if rms < MIN_RMS {
        return None;
    }
    let min_period = (rate / MAX_HZ).floor().max(2.0) as usize;
    let max_period = (rate / MIN_HZ).floor().min((WINDOW - 2) as f32) as usize;
    for period in (min_period - 1)..=(max_period + 1) {
        let mut product = 0.0;
        let mut squares = 0.0;
        for i in 0..(WINDOW - period) {
            let left = samples[i];
            let right = samples[i + period];
            product += left * right;
            squares += left * left + right * right;
        }
        nsdf[period] = if squares > 1e-6 {
            2.0 * product / squares
        } else {
            0.0
        };
    }
    let maximum = nsdf[min_period..=max_period]
        .iter()
        .copied()
        .fold(0.0, f32::max);
    if maximum < MIN_CONFIDENCE {
        return None;
    }
    let cutoff = (maximum * 0.85).max(MIN_CONFIDENCE);
    for period in min_period..=max_period {
        let peak = nsdf[period];
        if peak <= nsdf[period - 1] || peak < nsdf[period + 1] || peak < cutoff {
            continue;
        }
        let left = nsdf[period - 1];
        let right = nsdf[period + 1];
        let divisor = 2.0 * (2.0 * peak - left - right);
        let subperiod = if divisor.abs() > 1e-6 {
            period as f32 + ((right - left) / divisor).clamp(-1.0, 1.0)
        } else {
            period as f32
        };
        let frequency = rate / subperiod;
        if (MIN_HZ..=MAX_HZ).contains(&frequency) {
            return Some(TunerReading {
                frequency,
                confidence: peak,
            });
        }
    }
    None
}
