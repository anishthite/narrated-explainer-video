---
name: narrated-explainer-video
description: Make a narrated motion-graphics explainer video (MP4) from a document, report, artifact, spec or idea. It uses Remotion with local Kokoro text-to-speech, word-locked reveals, synthesized sound effects and a music bed, a critic pass on contact sheets, and a −14 LUFS master. Use when asked to "make an explainer video", "turn this doc/artifact into a video", "add voiceover/narration/sound effects to a video", "make a launch/demo/walkthrough video", or to improve, audit or re-time an existing Remotion explainer. Includes a tested project template, voice/SFX/mastering/QA scripts, and motion rules distilled from 8 motion-design skill repos.
---

# Narrated explainer video

A pipeline proven on a 6½-minute production explainer. Everything runs locally: no API keys, and the script never leaves the machine.

```
source doc ─► narration.json ─► tts/gen.py (Kokoro) ─► vo.json (clip lengths + word times)
                                                         │
             scenes/*.tsx ─── c.w(beat, word) cues ◄─ timeline.ts (scene lengths, cuts, chapters)
                                                         │
             tts/sfx.py (SFX + music bed) ──────────► Video.tsx ─► remotion render ─► tts/master.py ─► MP4
```

**Read first:**
- `reference/motion-rules.md` before building scenes. It holds the numbers.
- `reference/critic-prompt.md` before the review pass.
- `reference/motion-repos.md` lists the 15 motion-design repos behind those rules: which were read, what each is for, and which to open first for other jobs (launch videos, footage editing, site animation, HyperFrames/GSAP).

## Steps

### 1. Decide (ask only what you can't default)
| Question | Default |
|---|---|
| Audience | The people who own the source material |
| Length | Whatever the narration needs, about 2.6 words/s; budget about 150 words a minute |
| Voice | Local Kokoro `af_heart`. A cloud TTS (ElevenLabs, OpenAI) only with the user's key and OK, since it sends the script out |
| Brand | Neutral dark tokens in `template/src/theme.ts`; swap in the brand at hand |

### 2. Scaffold
Give each video its own folder so it doesn't collide with other projects or sessions.
`<skill-dir>` is the folder holding this `SKILL.md` (for example `~/.agents/skills/narrated-explainer-video`).
```bash
cp -R <skill-dir>/template <videos-dir>/<slug> && cd <videos-dir>/<slug>
npm install          # if a parent folder has node_modules, pin every @remotion/* to the parent's version
uv venv --python 3.12 .venv-tts
uv pip install --python .venv-tts/bin/python "kokoro>=0.9.4" soundfile numpy scipy faster-whisper \
  "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
.venv-tts/bin/python tts/sfx.py      # once: public/sfx/*.wav + public/music/bed.wav
```
For brand fonts, copy the `.woff2` files to `public/fonts` and list them in `FONT_FILES` in `src/theme.ts`. The logo goes in `public/`.

### 3. Write the script in `src/narration.json`
- Each scene has `id`, an optional `chapter` (drives the kicker and chapter rail), `minDur`, `cut` (the cut into the next scene) and `beats`.
- Each beat has `id` and `text`, plus optional `voice`, `gap`, or `silent: <frames>`.
- Spell out what is spoken: numbers as words, initialisms spaced out ("M C P"), "V two" for v2.
- One clause per beat, and at most 3.5 words/s.
- Keep 8–14 scenes, and give every scene a component in `src/Video.tsx` → `COMPONENTS`.

### 4. Generate the voice and check pronunciation
```bash
.venv-tts/bin/python tts/gen.py      # cached per voice+speed+text; writes src/vo.json with word times
.venv-tts/bin/python tts/qa.py       # Whisper re-transcribes every clip and prints word diffs
```
- Digits vs. spelled-out numbers in the diff are fine.
- Real mishearings mean a respelling: "playtest" → "play-test", "Ka-ching" → "Ka ching", "kept" → "stored".
- Re-run both scripts after any change.

### 5. Build the scenes
Start from `src/scenes/Example.tsx`, which shows every pattern. In each scene:
- `const c = useCues()`
- Cue reveals to words: `c.w('beat', 'word', nth?)`. Use `c.at(beat)` and `c.end(beat)` for beat bounds.
- Use `Scene` (`title`, `sub`, `chapter`, `camera`), `Appear` (spring entrance), `MaskRise`/`InlineRise` (type), `useDim` (step spent items back) and `useCount` (counters).
- Add one `<Sfx at=… name=… vol=…/>` per event, and use `popFor(i)` for rising pops.
- A wrong word throws on purpose. Prefer distinctive words; repeated words need `nth`.

### 6. Check every scene's final layout
```bash
npx tsc -p .
python3 tts/timeline.py                       # scene table, out/timeline.json
for p in $(python3 tts/timeline.py --ends); do npx remotion still src/index.ts Explainer out/end-${p%%:*}.png --frame=${p##*:} --scale=0.5; done
```
Tile the stills with ffmpeg `xstack` and look at them. This catches cue errors and collisions before a long render.

### 7. Draft and critique
```bash
npm run draft                                  # half scale, about 10 min for 6 min of video
.venv-tts/bin/python tts/qa_video.py out/draft.mp4 out/timeline.json out/sheets   # sheets + loudness
python3 tts/timeline.py --beats                # out/beats.txt for the critic
```
- Spawn a **separate read-only critic sub-agent** with `reference/critic-prompt.md`.
- Verify each claim with a still at the exact frame before fixing it, since the sheets are 1 fps.
- Fix, then spot-check the flagged moments with stills.

### 8. Final
```bash
npm run render                                 # out/.raw.mp4, 1080p, bt709, crf 18
.venv-tts/bin/python tts/master.py out/.raw.mp4 out/<slug>.mp4   # −14 LUFS, ≤ −1.5 dBTP, video copied
```
Pull 3–4 frames from the final file (a mid-cut frame, a busy moment, the last scene) before calling it done.

## Gotchas (all hit for real)
- **`@remotion/transitions` 4.0.532 needs React 19.** On 18 it fails with `__CLIENT_INTERNALS… not found`.
- **Remotion `fade()` keeps the outgoing scene opaque**, so titles overprint. Use `dip()` from `src/dip.tsx`.
- **`Appear` composes** a caller's `style.opacity`/`transform` with its own animation. Don't "fix" that back; overriding it makes dimmed items visible from frame 0.
- **Version check:** a parent folder's `node_modules` with a different `@remotion/*` version breaks the render. Match versions exactly, with no `^`.
- **Kokoro** needs the spaCy `en_core_web_sm` wheel (it isn't fetched automatically). Word times come from `result.tokens[*].start_ts`; `gen.py` adjusts them for silence trimming.
- **faster-whisper and PyAV:** `av.open(... metadata_errors=)` fails, so `qa.py` passes numpy audio resampled to 16 kHz instead.
- **macOS `say`** only has robotic voices unless premium ones are installed. Kokoro is far better.
- **Word-cue collisions:** "launch" in "launch day" fired the Launch Checklist card. Cue on the distinctive word ("checklist").
- **Counters** that start before their number is spoken sit at 0 and read as "zero". Start them on the number's own word.
- **Cuts overlap scenes:** total = Σ scene lengths − Σ cut lengths. Keep `LEAD` (22) ≥ the longest cut, so lines never start under a transition.
- **Sounds:** every SFX asset sits within about 15 dB of the narration's mean (sfx.py levels them). Spread-out peaks at −11…−12 dBFS before mastering are normal.
- **Size:** `public/music/bed.wav` is 88 MB for 8 minutes. That's fine locally; trim it to the video length to slim the bundle.

## Files
| Path | Role |
|---|---|
| `template/src/narration.json` | Script: scenes, beats, voices, cuts, chapters |
| `template/src/timeline.ts` | Scene lengths, cut overlaps, chapters, VO spans for ducking, `makeCues` |
| `template/src/ui.tsx` | Easings, springs, `Appear`, `MaskRise`, `InlineRise`, `useDim`, `useCount`, `Scene`, `Chip`, `Panel`, `Tag` |
| `template/src/fx.tsx` | `Sfx`, `MusicBed` (ducking), `Backdrop`, `Grade` (grain + vignette), `ChapterRail` |
| `template/src/dip.tsx` | Sequential cross-dip transition |
| `template/tts/gen.py` · `qa.py` | Kokoro narration with word times · Whisper pronunciation diff |
| `template/tts/sfx.py` | Synthesized SFX + music bed (A minor pentatonic) |
| `template/tts/timeline.py` | Python mirror of the timeline: table, `--ends`, `--beats` |
| `template/tts/qa_video.py` · `master.py` | Contact sheets + loudness · two-pass −14 LUFS master |
| `reference/motion-rules.md` · `critic-prompt.md` · `motion-repos.md` | Distilled rules · reviewer prompt · the 15 source repos |
