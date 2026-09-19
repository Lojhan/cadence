mod notes;
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
    #[serde(default)]
    target_chord: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultRow {
    id: String,
    target_mask: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_chord: Option<String>,
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
    confusions: BTreeMap<String, Summary>,
    cases: Vec<ResultRow>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trace: Option<Trace>,
    #[serde(skip_serializing_if = "Option::is_none")]
    note_probe: Option<notes::NoteProbe>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Trace {
    case_id: String,
    frames: Vec<TraceFrame>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TraceFrame {
    sample_end: usize,
    time_ms: f64,
    level: f32,
    score: f32,
    progress: f32,
    matched: bool,
    chroma: [f32; 12],
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
    let mut arguments = std::env::args().skip(1);
    let file = arguments
        .next()
        .ok_or("Usage: cadence-eval MANIFEST.json [gentle|balanced|precise [--trace-case ID | --notes-case ID]]")?;
    let (profile, profile_name) = match arguments.next().as_deref().unwrap_or("balanced") {
        "gentle" => (Profile::Gentle, "gentle"),
        "balanced" => (Profile::Balanced, "balanced"),
        "precise" => (Profile::Precise, "precise"),
        _ => return Err("Unknown recognition profile".into()),
    };
    let mut notes_case = None;
    let trace_case = match arguments.next().as_deref() {
        None => None,
        Some("--notes-case") => {
            notes_case = Some(arguments.next().ok_or("Missing notes case ID")?);
            None
        }
        Some("--trace-case") => Some(arguments.next().ok_or("Missing trace case ID")?),
        _ => return Err("Unexpected evaluation argument".into()),
    };
    if arguments.next().is_some() {
        return Err("Unexpected evaluation argument".into());
    }
    let manifest_path = Path::new(&file);
    let manifest: Manifest = serde_json::from_slice(&fs::read(manifest_path)?)?;
    if let Some(id) = notes_case.as_ref() {
        if !manifest.cases.iter().any(|case| &case.id == id) {
            return Err("Unknown notes case".into());
        }
    }
    if let Some(id) = &trace_case {
        if !manifest.cases.iter().any(|case| &case.id == id) {
            return Err("Unknown trace case".into());
        }
    }
    let directory = manifest_path.parent().ok_or("Manifest has no parent")?;
    let mut report = Report {
        note_probe: None,
        engine_version: env!("CARGO_PKG_VERSION"),
        profile: profile_name,
        summary: Summary::default(),
        groups: BTreeMap::new(),
        confusions: BTreeMap::new(),
        cases: vec![],
        trace: trace_case.map(|case_id| Trace {
            case_id,
            frames: vec![],
        }),
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
        let mut engine = Engine::new(rate as f32, profile)?;
        engine.arm(case.target_mask)?;
        if notes_case.as_ref() == Some(&case.id) {
            report.note_probe = Some(notes::probe(case.id.clone(), &samples[start..end], rate));
        }
        let mut latency_ms = None;
        let mut consumed = 0;
        for chunk in samples[start..end].chunks(2048) {
            consumed += chunk.len();
            let measured = engine.process(chunk);
            if let Some(trace) = &mut report.trace {
                if trace.case_id == case.id {
                    if let Some(chroma) = measured.chroma {
                        trace.frames.push(TraceFrame {
                            sample_end: consumed,
                            time_ms: consumed as f64 / f64::from(rate) * 1000.0,
                            level: measured.level,
                            score: measured.score,
                            progress: measured.progress,
                            matched: measured.matched,
                            chroma,
                        });
                    }
                }
            }
            if measured.matched {
                latency_ms = Some(consumed as f64 / f64::from(rate) * 1000.0);
                break;
            }
        }
        let row = ResultRow {
            id: case.id,
            target_mask: case.target_mask,
            target_chord: case.target_chord,
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
        let target = row
            .target_chord
            .clone()
            .unwrap_or_else(|| format!("mask:{}", row.target_mask));
        report
            .confusions
            .entry(format!("{}:{}→{}", row.split, row.chord, target))
            .or_default()
            .add(&row);
        report.cases.push(row);
    }
    report.summary.finish();
    for group in report
        .groups
        .values_mut()
        .chain(report.confusions.values_mut())
    {
        group.finish();
    }
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
