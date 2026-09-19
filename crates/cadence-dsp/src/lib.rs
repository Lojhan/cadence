//! Streaming, sample-rate-aware pitch-class features with preallocated FFT storage.
use rustfft::{num_complex::Complex, Fft, FftPlanner};
use std::sync::Arc;
pub const WINDOW: usize = 8192;
pub const HOP: usize = 2048;

pub struct Analyzer {
    rate: f32,
    ring: Vec<f32>,
    position: usize,
    filled: usize,
    hop: usize,
    window: Vec<f32>,
    spectrum: Vec<Complex<f32>>,
    scratch: Vec<Complex<f32>>,
    fft: Arc<dyn Fft<f32>>,
}
impl Analyzer {
    pub fn new(rate: f32) -> Self {
        let fft = FftPlanner::new().plan_fft_forward(WINDOW);
        let scratch = vec![Complex::default(); fft.get_inplace_scratch_len()];
        Self {
            rate,
            ring: vec![0.0; WINDOW],
            position: 0,
            filled: 0,
            hop: 0,
            window: (0..WINDOW)
                .map(|i| 0.5 - 0.5 * (std::f32::consts::TAU * i as f32 / (WINDOW - 1) as f32).cos())
                .collect(),
            spectrum: vec![Complex::default(); WINDOW],
            scratch,
            fft,
        }
    }
    pub fn clear(&mut self) {
        self.ring.fill(0.0);
        self.filled = 0;
        self.hop = 0;
        self.position = 0;
    }
    pub fn push(&mut self, sample: f32) -> Option<[f32; 12]> {
        self.ring[self.position] = sample;
        self.position = (self.position + 1) % WINDOW;
        self.filled = (self.filled + 1).min(WINDOW);
        self.hop += 1;
        if self.filled < WINDOW || self.hop < HOP {
            return None;
        }
        self.hop = 0;
        for i in 0..WINDOW {
            self.spectrum[i] = Complex::new(
                self.ring[(self.position + i) % WINDOW] * self.window[i],
                0.0,
            );
        }
        self.fft
            .process_with_scratch(&mut self.spectrum, &mut self.scratch);
        let mut chroma = [0.0_f32; 12];
        let min = (80.0 * WINDOW as f32 / self.rate).ceil() as usize;
        let max = (1800.0 * WINDOW as f32 / self.rate).floor() as usize;
        let peak = self.spectrum[min..=max]
            .iter()
            .map(|value| value.norm())
            .fold(0.0_f32, f32::max);
        for i in min..=max {
            let a = self.spectrum[i - 1].norm();
            let b = self.spectrum[i].norm();
            let c = self.spectrum[i + 1].norm();
            if b < peak * 0.08 || b <= a || b <= c {
                continue;
            }
            let offset = 0.5 * (a.ln() - c.ln()) / (a.ln() - 2.0 * b.ln() + c.ln());
            let frequency = (i as f32 + offset.clamp(-0.5, 0.5)) * self.rate / WINDOW as f32;
            // Require octave and third-partial support for bass fundamentals.
            // Isolated body resonances can otherwise mimic the wrong third.
            if frequency < 120.0 {
                let supported =
                    [(2.0, 0.08), (3.0, 0.04)]
                        .into_iter()
                        .all(|(partial, threshold)| {
                            let bin =
                                (frequency * partial * WINDOW as f32 / self.rate).round() as usize;
                            let support = self.spectrum[bin.saturating_sub(1)..=bin + 1]
                                .iter()
                                .map(|value| value.norm())
                                .fold(0.0_f32, f32::max);
                            support >= b * threshold
                        });
                if !supported {
                    continue;
                }
            }
            // Estimate non-octave partial energy from lower spectral peaks.
            // Odd harmonics otherwise invent a fifth or major third in chroma.
            let mut harmonic_energy = 0.0;
            for harmonic in [3.0_f32, 5.0, 7.0] {
                let fundamental = frequency / harmonic;
                if fundamental < 80.0 {
                    continue;
                }
                let bin = (fundamental * WINDOW as f32 / self.rate).round() as usize;
                for lower in bin.saturating_sub(1).max(1)..=bin + 1 {
                    let left = self.spectrum[lower - 1].norm();
                    let middle = self.spectrum[lower].norm();
                    let right = self.spectrum[lower + 1].norm();
                    if middle <= left || middle <= right || middle < peak * 0.08 {
                        continue;
                    }
                    let shift = 0.5 * (left.ln() - right.ln())
                        / (left.ln() - 2.0 * middle.ln() + right.ln());
                    let actual =
                        (lower as f32 + shift.clamp(-0.5, 0.5)) * self.rate / WINDOW as f32;
                    if (actual / fundamental - 1.0).abs() < 0.015 {
                        harmonic_energy +=
                            middle * (if harmonic == 3.0 { 1.0 } else { 2.0 }) / harmonic;
                    }
                }
            }
            let b = (b - harmonic_energy).max(0.0);
            let midi = 69.0 + 12.0 * (frequency / 440.0).log2();
            if (midi - midi.round()).abs() > 0.35 {
                continue;
            }
            // Favor fundamentals over upper partials, which can introduce
            // pitch classes not actually played (for example a fifth harmonic).
            chroma[(midi.round() as i32).rem_euclid(12) as usize] += b / frequency.sqrt();
        }
        Some(chroma)
    }
}
