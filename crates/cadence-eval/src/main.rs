use cadence_recognition::{Engine, Profile};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, error::Error, fs, path::Path};

#[derive(Deserialize)]
struct Manifest {
    cases: Vec<Case>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Case {
    id: String,
    file: String,
    target_mask: u16,
    expected_match: bool,
    start_seconds: f64,
    duration_seconds: f64,
    split: String,
    chord: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultRow {
    id: String,
    split: String,
    chord: String,
    expected_match: bool,
    matched: bool,
    latency_ms: Option<f64>,
    sample_rate: u32,
}
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Summary {
    true_positive: usize,
    false_negative: usize,
    false_positive: usize,
    true_negative: usize,
    p95_match_ms: Option<f64>,
    #[serde(skip)]
    latencies: Vec<f64>,
}
impl Summary {
    fn add(&mut self, row: &ResultRow) {
        match (row.expected_match, row.matched) {
            (true, true) => self.true_positive += 1,
            (true, false) => self.false_negative += 1,
            (false, true) => self.false_positive += 1,
            (false, false) => self.true_negative += 1,
        }
        if row.expected_match {
            if let Some(latency) = row.latency_ms {
                self.latencies.push(latency);
            }
        }
    }
    fn finish(&mut self) {
        self.latencies.sort_by(f64::total_cmp);
        if !self.latencies.is_empty() {
            self.p95_match_ms = self
                .latencies
                .get((self.latencies.len() as f64 * 0.95).ceil() as usize - 1)
                .copied();
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Report {
    engine_version: &'static str,
    profile: &'static str,
    summary: Summary,
    groups: BTreeMap<String, Summary>,
    cases: Vec<ResultRow>,
}
fn read_wave(path: &Path) -> Result<(u32, Vec<f32>), Box<dyn Error>> {
    let mut reader = hound::WavReader::open(path)?;
    let spec = reader.spec();
    if spec.channels == 0 || spec.channels > 8 {
        return Err("Unsupported channel count".into());
    }
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader.samples::<f32>().collect::<Result<Vec<_>, _>>()?,
        hound::SampleFormat::Int => {
            let scale = 2_f32.powi(i32::from(spec.bits_per_sample) - 1);
            reader
                .samples::<i32>()
                .map(|sample| sample.map(|value| value as f32 / scale))
                .collect::<Result<Vec<_>, _>>()?
        }
    };
    Ok((
        spec.sample_rate,
        samples
            .chunks(usize::from(spec.channels))
            .map(|channels| channels.iter().sum::<f32>() / channels.len() as f32)
            .collect(),
    ))
}
fn main() -> Result<(), Box<dyn Error>> {
    let file = std::env::args()
        .nth(1)
        .ok_or("Usage: cadence-eval MANIFEST.json")?;
    let manifest_path = Path::new(&file);
    let manifest: Manifest = serde_json::from_slice(&fs::read(manifest_path)?)?;
    let directory = manifest_path.parent().ok_or("Manifest has no parent")?;
    let mut report = Report {
        engine_version: env!("CARGO_PKG_VERSION"),
        profile: "balanced",
        summary: Summary::default(),
        groups: BTreeMap::new(),
        cases: vec![],
    };
    let mut previous_file = String::new();
    let mut samples = vec![];
    let mut rate = 0;
    for case in manifest.cases {
        if !case.start_seconds.is_finite()
            || case.start_seconds < 0.0
            || !case.duration_seconds.is_finite()
            || case.duration_seconds <= 0.0
        {
            return Err("Invalid evaluation interval".into());
        }
        if previous_file != case.file {
            (rate, samples) = read_wave(&directory.join(&case.file))?;
            previous_file = case.file;
        }
        let start = (case.start_seconds * f64::from(rate)).round() as usize;
        let end = ((case.start_seconds + case.duration_seconds) * f64::from(rate)).round() as usize;
        if start >= end || end > samples.len() {
            return Err(format!("{}: interval outside audio", case.id).into());
        }
        let mut engine = Engine::new(rate as f32, Profile::Balanced)?;
        engine.arm(case.target_mask)?;
        let mut latency_ms = None;
        let mut consumed = 0;
        for chunk in samples[start..end].chunks(2048) {
            consumed += chunk.len();
            if engine.process(chunk).matched {
                latency_ms = Some(consumed as f64 / f64::from(rate) * 1000.0);
                break;
            }
        }
        let row = ResultRow {
            id: case.id,
            split: case.split,
            chord: case.chord,
            expected_match: case.expected_match,
            matched: latency_ms.is_some(),
            latency_ms,
            sample_rate: rate,
        };
        report.summary.add(&row);
        report
            .groups
            .entry(format!("{}:{}", row.split, row.chord))
            .or_default()
            .add(&row);
        report.cases.push(row);
    }
    report.summary.finish();
    for group in report.groups.values_mut() {
        group.finish();
    }
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
