//! Independent causal adaptation of Klapuri (ISMIR 2006), equations 2, 3, 7, 8.
//! ERB whitening, harmonic salience and iterative cancellation. The target chord
//! never enters this estimator. All buffers and candidate kernels are preallocated.
use crate::WINDOW;
use rustfft::num_complex::Complex;

const BANDS: usize = 30;
const PARTIALS: usize = 20;
#[derive(Clone, Copy, Default)]
struct Partial {
    low: usize,
    high: usize,
    weight: f32,
    center: f32,
}
struct Candidate {
    midi: usize,
    partials: [Partial; PARTIALS],
}
pub(crate) struct MultiPitch {
    bands: Vec<(usize, f32, usize, f32)>,
    candidates: Vec<Candidate>,
    magnitude: Vec<f32>,
    residual: Vec<f32>,
    peak_positions: Vec<f32>,
}
impl MultiPitch {
    pub fn new(rate: f32) -> Self {
        let hz = rate / WINDOW as f32;
        let center = |b: usize| 229.0 * (10.0_f32.powf((b as f32 + 1.0) / 21.4) - 1.0);
        let centers: [f32; BANDS] = std::array::from_fn(|b| center(b + 1));
        let size = ((5000.0_f32.min(rate * 0.5 - hz) / hz).floor() as usize + 1).min(WINDOW / 2);
        let bands = (0..size)
            .map(|k| {
                let f = k as f32 * hz;
                let upper = centers.partition_point(|c| *c < f).min(BANDS - 1);
                let lower = upper.saturating_sub(1);
                let t = if lower == upper {
                    0.0
                } else {
                    ((f - centers[lower]) / (centers[upper] - centers[lower])).clamp(0.0, 1.0)
                };
                (lower, 1.0 - t, upper, t)
            })
            .collect();
        let mut candidates = Vec::new();
        for midi in 40..=88 {
            for tuning in -4..=4 {
                let f = 440.0 * 2.0_f32.powf((midi as f32 - 69.0 + tuning as f32 * 0.1) / 12.0);
                let partials = std::array::from_fn(|index| {
                    let harmonic = (index + 1) as f32;
                    let bin = harmonic * f / hz;
                    if bin >= (size - 2) as f32 {
                        return Partial::default();
                    }
                    let radius = (bin * 0.003).max(0.5);
                    Partial {
                        low: ((bin - radius).round() as usize).max(1),
                        high: ((bin + radius).round() as usize).min(size - 2),
                        center: bin,
                        weight: (f + 52.0) / (harmonic * f + 320.0),
                    }
                });
                candidates.push(Candidate { midi, partials });
            }
        }
        Self {
            bands,
            candidates,
            magnitude: vec![0.0; size],
            residual: vec![0.0; size],
            peak_positions: vec![0.0; size],
        }
    }
    pub fn analyze(&mut self, spectrum: &[Complex<f32>]) -> [f32; 12] {
        let mut energy = [0.0_f32; BANDS];
        for (k, value) in self.magnitude.iter_mut().enumerate() {
            *value = spectrum[k].norm();
            let (a, wa, b, wb) = self.bands[k];
            energy[a] += *value * *value * wa;
            energy[b] += *value * *value * wb;
        }
        // Interpolate actual peak locations before whitening/cancellation. A
        // whole-bin maximum alone can assign a bass peak to the adjacent note.
        for k in 1..self.magnitude.len() - 1 {
            let a = self.magnitude[k - 1].max(1e-20).ln();
            let b = self.magnitude[k].max(1e-20).ln();
            let c = self.magnitude[k + 1].max(1e-20).ln();
            let offset = if b > a && b > c {
                (0.5 * (a - c) / (a - 2.0 * b + c)).clamp(-0.5, 0.5)
            } else {
                0.0
            };
            self.peak_positions[k] = k as f32 + offset;
        }
        let max = energy.iter().copied().fold(0.0_f32, f32::max);
        if max <= 1e-20 {
            return [0.0; 12];
        }
        // A relative floor bounds amplification in empty bands and preserves
        // gain invariance. The exponent converts band power to sigma^(nu - 1).
        let gain = energy.map(|e| (e.max(max * 0.0001) / WINDOW as f32).powf(-0.335));
        for (k, value) in self.magnitude.iter_mut().enumerate() {
            let (a, wa, b, wb) = self.bands[k];
            *value *= gain[a] * wa + gain[b] * wb;
            self.residual[k] = *value;
        }
        let mut chroma = [0.0_f32; 12];
        let mut selected = [false; 89];
        let mut sum = 0.0;
        let mut quality = 0.0;
        for count in 1..=6 {
            let mut best = 0;
            let mut score = 0.0;
            for (index, candidate) in self.candidates.iter().enumerate() {
                if selected[candidate.midi] {
                    continue;
                }
                let salience = candidate
                    .partials
                    .iter()
                    .filter(|p| p.weight > 0.0)
                    .map(|p| {
                        (p.low..=p.high)
                            .map(|k| {
                                let delta = self.peak_positions[k] - p.center;
                                self.residual[k]
                                    / (1.0 + 0.25 * (delta / (p.center * 0.003).max(0.5)).powi(2))
                            })
                            .fold(0.0_f32, f32::max)
                            * p.weight
                    })
                    .sum::<f32>();
                if salience > score {
                    score = salience;
                    best = index;
                }
            }
            let next_quality = (sum + score) / (count as f32).powf(0.5);
            if score <= 0.0 || next_quality <= quality {
                break;
            }
            quality = next_quality;
            sum += score;
            let candidate = &self.candidates[best];
            selected[candidate.midi] = true;
            chroma[candidate.midi % 12] += score;
            for partial in candidate.partials.iter().filter(|p| p.weight > 0.0) {
                let peak = (partial.low..=partial.high)
                    .max_by(|a, b| self.residual[*a].total_cmp(&self.residual[*b]))
                    .unwrap();
                // Cancel the local Hann main lobe, leaving upper partials partly
                // available to other notes with shared harmonics.
                let low = peak.saturating_sub(2).max(1);
                let high = (peak + 2).min(self.residual.len() - 1);
                for k in low..=high {
                    self.residual[k] *= (1.0 - 1.8 * partial.weight).max(0.0);
                }
            }
        }
        chroma
    }
}
