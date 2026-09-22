use cadence_dsp::Tuner;
use cadence_recognition::{Engine, Profile, Report};
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub struct RecognitionEngine {
    engine: Engine,
    input: Box<[f32; 2048]>,
    report: Report,
}
#[wasm_bindgen]
impl RecognitionEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, profile: u8) -> Result<Self, JsError> {
        let profile = match profile {
            0 => Profile::Gentle,
            1 => Profile::Balanced,
            2 => Profile::Precise,
            _ => return Err(JsError::new("Invalid profile")),
        };
        Ok(Self {
            engine: Engine::new(sample_rate, profile).map_err(JsError::new)?,
            input: Box::new([0.0; 2048]),
            report: Report::default(),
        })
    }
    pub fn input_pointer(&self) -> *const f32 {
        self.input.as_ptr()
    }
    pub fn arm(&mut self, mask: u16) -> Result<(), JsError> {
        self.engine.arm(mask).map_err(JsError::new)
    }
    pub fn reset(&mut self) {
        self.engine.reset();
        self.report = Report::default();
        self.input.fill(0.0);
    }
    pub fn process(&mut self, length: usize) -> Result<bool, JsError> {
        if length > self.input.len() {
            return Err(JsError::new("Input exceeds buffer capacity"));
        }
        self.report = self.engine.process(&self.input[..length]);
        Ok(self.report.matched)
    }
    pub fn level(&self) -> f32 {
        self.report.level
    }
    pub fn score(&self) -> f32 {
        self.report.score
    }
    pub fn progress(&self) -> f32 {
        self.report.progress
    }
}

#[wasm_bindgen]
pub struct TunerEngine {
    engine: Tuner,
    input: Box<[f32; 2048]>,
}

#[wasm_bindgen]
impl TunerEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Result<Self, JsError> {
        Ok(Self {
            engine: Tuner::new(sample_rate).map_err(JsError::new)?,
            input: Box::new([0.0; 2048]),
        })
    }
    pub fn input_pointer(&self) -> *const f32 {
        self.input.as_ptr()
    }
    pub fn reset(&mut self) {
        self.engine.reset();
        self.input.fill(0.0);
    }
    pub fn process(&mut self, length: usize) -> Result<bool, JsError> {
        if length > self.input.len() {
            return Err(JsError::new("Input exceeds buffer capacity"));
        }
        Ok(self.engine.process(&self.input[..length]))
    }
    pub fn frequency(&self) -> f32 {
        self.engine
            .reading()
            .map_or(0.0, |reading| reading.frequency)
    }
    pub fn confidence(&self) -> f32 {
        self.engine
            .reading()
            .map_or(0.0, |reading| reading.confidence)
    }
}
