# Tablature annotations

Cadence accepts aligned six-string ASCII tablature. The saved source chart is
the source of truth: loading a song parses its fret positions, chord changes,
and rhythm cues again, so these annotations survive export and import without
a separate database column.

```text
{chords: G - D -}
{rhythm: D8 U8 D4 P4}
e|--3---3---2---2--|
B|--0---0---3---3--|
G|--0---0---2---2--|
D|--0---0---0---0--|
A|--2---2----------|
E|--3---3----------|
```

Each annotation has one whitespace-separated token per sounding note group in
the following six-string staff. A chord name starts a new harmony; `-` carries
the previous chord without printing it again. The chord lane is independent of
the fret numbers. Consecutive equal chord names are displayed once.

In the rhythm lane, `D`, `U`, and `P` mean downstroke, upstroke, and pluck.
Append `1`, `2`, `4`, `8`, or `16` for a whole, half, quarter, eighth, or
sixteenth-note value. A `-` leaves that event unmarked. These are explicit
author-supplied practice cues. Cadence does not derive timing from ASCII dash
spacing, and microphone recognition does not grade stroke direction or
duration.

Chord symbols above the music and a distinct rhythm lane follow the same
separation used in [MuseScore's chord-symbol guidance](https://handbook.musescore.org/text/chord-symbols),
[MuseScore's tablature rhythm options](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties),
and [LilyPond's guitar strum examples](https://lilypond.org/doc/v2.26/Documentation/snippets/rhythms-_002d-guitar-strum-rhythms).
