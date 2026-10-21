# GTab — Guitar Practice Studio

Local guitar practice with real instrument samples and six-stem Demucs separation.

## Start

Python 3.10–3.12 is required. The current workspace already has dependencies and model weights installed.

```sh
.venv/bin/python backend/server.py
```

Open **http://127.0.0.1:8765**. The backend serves both the website and its API; the old `python -m http.server` preview does not support separation. Stop with Ctrl+C.

For a fresh installation:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python backend/server.py
```

## Separate and practice

1. Import an MP3, WAV, M4A, FLAC or OGG file (100 MB maximum).
2. In the practice room, click **Separate instruments**.
3. The local CPU worker uses Demucs `htdemucs_6s` to generate guitar, bass, drums, vocals, piano and other stems. Tracks must be 1 second–10 minutes long. Processing can take several minutes, depending on the track and machine.
4. Mute Guitar to practice over the remaining band, or adjust individual levels. The Other control combines vocals, piano and other instruments. Use arrow keys or drag the knobs.
5. **Use original** switches back to the untouched recording. **Download 6 stems** saves all six lossless WAV files in a ZIP.

All six stems start on one Web Audio clock and seek/loop together. Click the waveform to seek; Alt/Option-click sets loop start, Shift-click sets loop end, and double-click clears it. Playback-speed changes on separated audio also change pitch. Pitch-preserving stem time-stretching is not implemented.

Separation runs locally; user audio is not sent to an external service. The model weights (about 53 MB) download from Meta on first use and are cached in `.gtab-data/model-cache`. Results are stored under `.gtab-data/`. Uploads are removed after processing. Replacing a track removes its completed job; Cancel stops a queued/running job. Finished jobs older than 24 hours and results beyond the latest eight are removed during startup or job cleanup. Model files are retained. Reloading the page does not restore the previous session.

This server is for a single local user. It binds only to `127.0.0.1`, rejects foreign origins/hosts, limits the queue to three jobs, and runs one inference process at a time. Do not expose it as a public service without authentication and production hosting controls.

## More natural instruments

Lick previews and chord accompaniment use bundled recorded acoustic guitar and electric bass samples, with a gentle low-pass filter, short room reverb, compression, and output limiting. Notes have varied picking strength; chords use staggered strums. These replace the former oscillator guitar/bass sounds. Percussion remains synthesized. Samples load once into memory, and new voices reuse those buffers. Tone.js and web fonts still load from external CDNs.

Sample credits and licenses are in `assets/samples/ATTRIBUTION.md` and `assets/samples/LICENSE.md`. The original CC BY 3.0 recordings are redistributed unmodified; playback adds pitch/envelope/effect processing. `scripts/fetch_samples.py` can restore the bundled subset.

## API

- `GET /api/health`: dependency readiness and model name.
- `POST /api/jobs`: raw audio body, with `X-GTab-Request: 1` and `X-Audio-Extension: .wav` (or another supported extension). Returns a job ID.
- `GET /api/jobs/{id}`: queued/running/complete/failed/cancelled status and real processing stage; completed jobs include stem/download URLs.
- `GET /api/jobs/{id}/stems/{instrument}.wav`: completed stem.
- `GET /api/jobs/{id}/download`: six-stem ZIP.
- `DELETE /api/jobs/{id}` with `X-GTab-Request: 1`: cancels active work or deletes a finished result.

`GTAB_DATA_DIR` overrides the data directory; `--port` overrides port 8765. Inference has a one-hour timeout. Worker diagnostics are in each job's `worker.log`. On restart, interrupted jobs are marked failed so they can be retried.

## Checks

```sh
.venv/bin/python -m unittest discover -s tests -v
node --test tests/test_audio.cjs
```

The HTTP tests cover validation, local access, queue limits, cancellation, failure reporting, and model-cache retention. Audio tests cover shared timing, seek/restart, fader routing, cancellation during resume, and disposal. `scripts/make_test_track.py` creates a short test recording from the licensed samples for real inference checks.

## Limits

Separation is an estimate, with possible bleed and artifacts; guitar/piano separation in this experimental six-source model is imperfect. Reference tablature remains hand-authored, not a transcription of the upload. Count-in, automatic transcription, scale-degree conversion, and Guitar Pro/MusicXML export remain unimplemented. Tabs, lick packs, JSON practice settings and original audio can be downloaded.


## Guitar notation

Practice opens with original vector fretboard diagrams: wood necks, finger numbers, open/muted strings, fret positions, and E–A–D–G–B–E labels. Click a chord to hear its displayed voicing. The Tablature switch shows larger staff-style fret numbers; passages scroll horizontally. Study chord shapes are reference accompaniment, not analysis of an uploaded song. Progressions use the same diagrams and highlight the current chord. Common shapes show finger numbers; generated three-string triads explicitly show fret numbers instead.

Notation checks: `node --test tests/test_notation.cjs` verifies the D fingering, every root/quality combination, and tablature tokens.

### Interval practice

Choose **View pattern** beside any lick, or **Full study** for the current genre. The neck, ordered note sequence, and enlarged tab share root-relative interval colors. Set the root to analyze a different tonal center (this does not transpose the notes). **Start practice** plays the displayed frets using the recorded guitar voice. Speed ranges from 25–200% without changing pitch; repetitions range from 1–32 and stop automatically. Speed can change during playback. Stop, changing genre, selecting a different pattern, or leaving Practice cancels playback.

ASCII tabs do not encode precise rhythm: practice uses even eighth-note steps, grouping aligned frets as chords and approximating ornaments as separate notes.

### Guided routines

Open **Progressions** for the advanced-beginner routine. Choose a key, a major or minor progression, any combination of triads / pentatonic / scales, and 1–16 rounds per exercise. Each chord gets eight eighth notes (one 4/4 bar), with a soft chord underneath. Exercises run in order and stop automatically. Tempo is adjustable live from 40–140 BPM. Triads use compact shapes on the highest three strings; pentatonic and scale phrases stay within one five-fret position and start on an available chord tone. The interval labels use the selected key as their root. Start at 60 BPM and increase only after clean, relaxed repetitions.

### Learning tools

Guided routines now default to a four-beat count-in followed by listen, answer over chords, and unaccompanied passes. Ear-first mode hides notation during the demonstration; Reveal restores it. Choose a two-chord transition (including the fourth chord back to the first), chord-relative or key-relative interval labels, and full, interval-only, or chord-name visual help. Pentatonic/scale phrases optionally leave rests on steps 4 and 7 and resolve to their starting chord tone. Triad selection favors small movements from the preceding shape.

After completing or stopping a routine, choose a self-assessment. Comfortable proposes +5 BPM; uneven preserves tempo; lost simplifies to one exercise and a two-chord loop at a slower tempo. The saved focus stays in this browser and is restored only with Revisit saved focus. There is no microphone recording or automatic performance grading in this feature.

### Microphone feedback and iPad

Enable the microphone from Guided routine, use headphones, and play single notes during answer/play-alone passes. Audio is analyzed locally and never saved or uploaded. A pitch-match estimate is shown only with at least four detected notes and 60% coverage; it is not a rhythm, chord, or expression score. Synthetic tests cover guitar-range pitches, harmonics, silence, octave errors and sparse evidence. Real instrument/room and physical iPad validation remain necessary before treating this as a calibrated assessment.

Home now tracks up to 100 local sessions, time, days practiced and measured pitch scores separately from self-assessments. No history is synchronized between devices. Tablet layouts use touch-sized controls, safe-area spacing and collapsible advanced tools.

The current development server binds only to this computer's localhost. iPad microphone access requires hosting the frontend at a trusted HTTPS URL (or an appropriately configured HTTPS local server); opening a plain HTTP LAN address does not enable microphone capture. Local stem-separation endpoints require their own secure deployment configuration and are not exposed to the network by these changes.
