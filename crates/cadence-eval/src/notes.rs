//! Experimental offline harmonic-template decomposition; never used for matching.
use rustfft::{num_complex::Complex, FftPlanner};
use serde::Serialize;

const WINDOW: usize = 8192;
const HOP: usize = 2048;
const FIRST: u8 = 40;
const LAST: u8 = 88;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteProbe {
    pub case_id: String,
    pub frames: Vec<Frame>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Frame {
    sample_end: usize,
    time_ms: f64,
    relative_error: f64,
    notes: Vec<Note>,
}
#[derive(Serialize)]
pub struct Note {
    midi: u8,
    strength: f64,
}

fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(a, b)| a * b).sum()
}

// Coordinate descent on ||Ax-y||² subject to x >= 0. Each column has unit norm.
fn solve(gram: &[Vec<f64>], cross: &[f64]) -> Vec<f64> {
    let mut weights = vec![0.0; cross.len()];
    for _ in 0..200 {
        let mut largest_change = 0.0_f64;
        for i in 0..weights.len() {
            let next = (weights[i] + cross[i] - dot(&gram[i], &weights)).max(0.0);
            largest_change = largest_change.max((next - weights[i]).abs());
            weights[i] = next;
        }
        if largest_change < 1e-9 {
            break;
        }
    }
    weights
}

pub fn probe(case_id: String, samples: &[f32], rate: u32) -> NoteProbe {
    let fft = FftPlanner::<f64>::new().plan_fft_forward(WINDOW);
    let window: Vec<f64> = (0..WINDOW)
        .map(|i| 0.5 - 0.5 * (std::f64::consts::TAU * i as f64 / WINDOW as f64).cos())
        .collect();
    let bins = (4000.0 * WINDOW as f64 / f64::from(rate))
        .ceil()
        .min((WINDOW / 2) as f64) as usize;
    let spectrum = |samples: &[f64]| {
        let mut buffer: Vec<_> = samples
            .iter()
            .zip(&window)
            .map(|(sample, window)| Complex::new(sample * window, 0.0))
            .collect();
        fft.process(&mut buffer);
        buffer[..bins]
            .iter()
            .map(|bin| bin.norm())
            .collect::<Vec<_>>()
    };
    // An explicit experimental prior: ten harmonics with 1/h amplitude.
    // This is not an instrument model or a transcription accuracy claim.
    let dictionary: Vec<Vec<f64>> = (FIRST..=LAST)
        .map(|midi| {
            let frequency = 440.0 * 2_f64.powf((f64::from(midi) - 69.0) / 12.0);
            let tone: Vec<f64> = (0..WINDOW)
                .map(|i| {
                    (1..=10)
                        .filter(|h| {
                            frequency * f64::from(*h) < 4000.0_f64.min(f64::from(rate) / 2.0)
                        })
                        .map(|h| {
                            (std::f64::consts::TAU * frequency * f64::from(h) * i as f64
                                / f64::from(rate))
                            .sin()
                                / f64::from(h)
                        })
                        .sum()
                })
                .collect();
            let mut column = spectrum(&tone);
            let norm = dot(&column, &column).sqrt();
            for value in &mut column {
                *value /= norm;
            }
            column
        })
        .collect();
    let gram: Vec<Vec<f64>> = dictionary
        .iter()
        .map(|a| dictionary.iter().map(|b| dot(a, b)).collect())
        .collect();
    let mut frames = vec![];
    for end in (WINDOW..=samples.len()).step_by(HOP) {
        let input: Vec<f64> = samples[end - WINDOW..end]
            .iter()
            .map(|x| f64::from(*x))
            .collect();
        let measured = spectrum(&input);
        let cross: Vec<f64> = dictionary
            .iter()
            .map(|column| dot(column, &measured))
            .collect();
        let weights = solve(&gram, &cross);
        let error: f64 = measured
            .iter()
            .enumerate()
            .map(|(bin, actual)| {
                let reconstructed: f64 = dictionary
                    .iter()
                    .zip(&weights)
                    .map(|(column, weight)| column[bin] * weight)
                    .sum();
                (actual - reconstructed).powi(2)
            })
            .sum();
        let energy = dot(&measured, &measured);
        frames.push(Frame {
            sample_end: end,
            time_ms: end as f64 / f64::from(rate) * 1000.0,
            relative_error: if energy > 0.0 {
                (error / energy).sqrt()
            } else {
                0.0
            },
            notes: (FIRST..=LAST)
                .zip(weights)
                .map(|(midi, strength)| Note { midi, strength })
                .collect(),
        });
    }
    NoteProbe { case_id, frames }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn separates_overlapping_columns_and_clamps_negative_evidence() {
        let gram = vec![
            vec![1.0, 0.5, 0.0],
            vec![0.5, 1.0, 0.0],
            vec![0.0, 0.0, 1.0],
        ];
        let weights = solve(&gram, &[2.5, 2.0, -0.3]);
        assert!((weights[0] - 2.0).abs() < 1e-7);
        assert!((weights[1] - 1.0).abs() < 1e-7);
        assert_eq!(weights[2], 0.0);
    }
    #[test]
    fn silence_has_no_notes_or_error() {
        let result = probe("silence".into(), &vec![0.0; WINDOW], 48000);
        assert_eq!(result.frames.len(), 1);
        assert_eq!(result.frames[0].relative_error, 0.0);
        assert!(result.frames[0]
            .notes
            .iter()
            .all(|note| note.strength == 0.0));
    }
}
