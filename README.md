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

Home keeps local practice history and separates measured pitch scores from self-assessments. No history is synchronized between devices. Tablet layouts use touch-sized controls, safe-area spacing and collapsible advanced tools.

The current development server binds only to this computer's localhost. iPad microphone access requires hosting the frontend at a trusted HTTPS URL (or an appropriately configured HTTPS local server); opening a plain HTTP LAN address does not enable microphone capture. Local stem-separation endpoints require their own secure deployment configuration and are not exposed to the network by these changes.

### Weekly bridge path

Home has one dated weekly mission, a four-level path, XP, and morning/evening launch buttons. The levels are triads, seventh arpeggios, pentatonic, and scales. Each level contains six progressively varied weekly missions: minor rock, major I–IV–V, 12-bar blues, Andalusian, neoclassical, and major jazz ii–V–I. The five CAGED areas recur across that path. Free practice remains available separately.

The musical goal is to play *into* the next chord: a nearby vocabulary note approaches the next third (or alternating third/seventh at arpeggio level), the last upbeat anticipates that destination, and the next bar begins on exactly the same pitch. The target can intentionally fall outside the current chord or pentatonic collection. The visual cue shows the upcoming chord, target pitch, approach and landing. Rests on steps 2 and 6 create breathing space. A selected two-chord loop retargets its final phrase back to its first chord.

### Morning, evening and rewards

Both 30-minute sessions use the same weekly level, progression, position and tempo. The first mission is Am–F–C–G, E area, 65 BPM. Morning develops singing, anticipation and connected motifs; evening supplies backing only. Neither free improvisation nor a self-assessment is presented as a microphone grade.

Each full session earns 100 XP. A weekly bridge badge requires three full sessions including both morning and evening, then an explicit self-check confirming three consecutive loops with sung destinations, anticipations/beat-one landings, and motif/space. The badge earns 200 XP. It unlocks the next mission, which starts no earlier than the following week. Six weekly badges lead to the next vocabulary level. Duplicate session IDs do not earn duplicate XP. Partial sessions remain in history without completion rewards.

Pauses, navigation away and backgrounding exclude inactive time. Sessions resume after reload, and Finish records one session rather than each loop. Rewards and badge evidence travel in history backups. The active week's local schedule is stored separately. Old history is retained but does not retroactively award new badges. Library PDFs and recordings remain local and are not published.

### Focus view, input check and comparable takes

Start routine enters the optional focus view: current/next chord, beat, model notation and persistent Pause / Repeat transition / Finish controls. Pause silences the model and resumes from the current note; paused time is excluded from session duration. Changing tabs pauses the routine and releases the microphone. Re-enable and check the microphone after an interruption to restore scoring. The optional screen wake lock is best-effort; low battery, unsupported browsers or OS policies can release it.

Before scoring, enable the microphone and use **Input check & timing adjustment**. Stay quiet for 2.5 seconds, then pluck the selected open string for 4 seconds. The check measures background level, pitch consistency and clipping; it does not grade the player or measure latency. Delay compensation is manual, 0–250 ms. Keep wired headphones on to avoid the model leaking into the microphone. Expected/detected note details and a targeted transition retry appear after a take. Physical iPad and live-instrument validation are still required; generated tones do not prove real-world accuracy.

Creative challenge passes add a musical constraint over the selected progression and are not scored against the model. New session records include key, progression, tempo, position, learning mode, assistance, input-check state and exercise mix. Comparisons require completed takes with identical settings and assessment version. In-session changes exclude a take from comparison.

**Backup & restore** on Home exports a versioned JSON file. Restore validates it and merges by session ID. Clear history has an Undo option until the page is reloaded. Backups are manual device transfer, not cloud synchronization; a browser storage warning prompts export if local saving fails.

### HTTPS deployment

`scripts/build_site.py` packages only the public frontend and licensed instrument samples into `site-dist/`. The Pages workflow runs JavaScript tests, builds, then publishes that directory. In GitHub repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source, then run **Publish GTab practice site** if a prior deployment failed. The deployed Pages address is `https://www.josephpress.com/GTab/`. Python stem separation remains local and is disabled in the GitHub Pages frontend. GitHub sign-in/settings access is required to enable Pages; a successful source push alone does not establish hosting.
