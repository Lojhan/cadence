# Tablature practice

Cadence accepts a complete song as aligned six-string ASCII tab in **Library → Import**.
Each staff has exactly six lines, ordered `e`, `B`, `G`, `D`, `A`, `E` from high to low.
Frets `0`–`24`, barlines, and multiple staves are supported. Blank lines and text
headings may separate staves. Add a `{tuning: drop_d}` line to use a supported
tuning preset. The source text is retained when a personal song is exported.

```text
Intro
e|--3---2---0---0--|
B|--0---3---1---1--|
G|--0---2---2---0--|
D|--0---0---2---2--|
A|--2-------0---3--|
E|--3--------------|
```

Cadence turns each aligned fret column into a note group. The Rust/WASM engine
checks the target and advances when it matches, so the player sets the pace.
Single notes use absolute pitch tracking; note groups use spectral evidence for
their target pitches. A matched target disarms until the next target is armed,
and repeating the same target requires a new attack. The viewer shows the whole
tab and keeps the current column in view. Position saving, editing, and portable
archives use the same personal-song workflow as chord charts.

ASCII spacing does not reliably encode note duration. Cadence does not score
rhythm, string choice between equivalent pitches, bends, slides, hammer-ons,
pull-offs, or other technique markers. It rejects unsupported symbols during
import. Synthetic tests exercise the Rust and WASM engines with an original
G–D–Am–C accompaniment exercise for *Knockin’ on Heaven’s Door*. They do not
establish live-guitar recognition accuracy; that requires recorded and physical
device evaluation. Import complete published tabs only when you have the right
to use their transcription.
