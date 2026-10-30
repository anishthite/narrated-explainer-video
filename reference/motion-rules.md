# Motion, type and sound rules

Distilled from remotion-dev/skills, haidrrrry/claude-remotion-skill, whaleyxbt/claude-motion, howseen-ai/claude-motion-design, LottieFiles/motion-design-skill, charlie947/motion-graphics-skills, cth9191/animate and AbubakrChan/product-launch-motion. The template already implements the parts marked ✓. Links and the status of each repo are in `motion-repos.md`.

## Timing and sync
- ✓ **Lock reveals to the word.** Cue each reveal to the start of the word that names it, and prefer the verb or emphasis word: `c.w(beat, word)`.
  - Text the viewer has to read can start 1–2 frames early. A "hit" (a stat landing, a state flip) fires exactly on its word.
- ✓ **Shot length = narration + pad.** Lead 22 frames, a 9-frame breath between lines, and a still 26-frame tail before the cut.
- **Something new every 2–4 s.** A still stretch over 3 s is a defect, except a final hold of 1.5 s or less. Fill it with a sub-reveal cued to a later word in the same line.
- **No dump-then-freeze.** At time t, show only what the voice has said by time t.
- **Silent text** (no narration covering it) holds 0.35 s per word + 0.3 s, and never less than 1.2 s. Cut it if you can't afford the hold.

## Easing and springs (`src/ui.tsx`)
- ✓ Entrances: expo-out `bezier(0.16,1,0.3,1)`, 10–14 frames, 10–28 px travel, with scale 0.97→1 as a third channel.
- ✓ Exits: ease-in `bezier(0.7,0,0.84,0)`, 65–75% of the entrance length.
- ✓ Moves between two states: `bezier(0.65,0,0.35,1)`.
- ✓ Values that land (bars, counters): `bezier(0.55,0,0.2,1.12)`, a small overshoot. Use this on the claim bar only.
- ✓ Springs: damping ratio d/(2√(k·m)) ≥ 0.72. No cartoon bounce in a report.
  - card: 26/170/1
  - chip: 20/220/0.8
  - heavy type: 24/120/1
- ✓ Type rises out of a mask (`MaskRise`, `InlineRise`) instead of fading in. Use one accent word per headline.
- Linear motion only for continuous drift, grain, and counters running over 2 s.

## Hierarchy
- ✓ **Spent items step back.** When a new beat starts, dim the previous group to about 0.4–0.5 (`useDim`) and turn its accent gray.
- **One accent element at a time.** The accent color means "current focus" and nothing else.
- Type floor at 1080p: body text ≥ 20 px, mono labels ≥ 18 px, headline about 62 px, hero 140–170 px.
- Use `fontVariantNumeric: 'tabular-nums'` on every number that changes.
- **Balance the frame.** When one column waits for a later beat, centre the other column, then slide it over when the second arrives (`translateX` on the beat).

## Charts
- ✓ Bars grow with `scaleX`/`scaleY` from the axis origin, never by animating `width`/`height`. Stagger them in reading order. The claim bar gets the overshoot.
- ✓ Draw lines with `pathLength` or `stroke-dashoffset`. Dots pop as the line reaches them.
- Draw the axis first. Titles, labels and axes never move. No camera push while bars are staggering.
- Counters start on the word naming the value and land before the next clause. Never show "0" for long: start the count on the number's own word.

## Cuts (`src/dip.tsx`, the `cut` field in narration.json)
- ✓ **Choose the cut by what it means:**
  - dip (sequential cross-fade, 16–18 f) between unrelated beats
  - slide/push (20 f) through a sequence
  - wipe (20 f) at a chapter turn
- Never the same cut more than twice in a row.
- Never use Remotion's `fade()` between title cards. It keeps the outgoing scene opaque, so the two titles overprint.
- ✓ Backdrop, grain, chapter rail and music sit outside the `TransitionSeries`, so only content transitions.
- Hold the composition still at the cut. Nothing should be mid-motion when it leaves.

## Camera and grade
- ✓ **One slow move per scene** (`Scene camera=`):
  - push: scale 1→1.022
  - drift: 14 px
  - still
- Alternate the move; never use the same one on two adjacent scenes. Use still on charts.
- ✓ **Grain:** `feTurbulence` with baseFrequency 0.85, reseeded every 2 frames (not every frame, which bloats the file), overlay blend at opacity about 0.075.
- ✓ **Vignette:** 58%→100% radial, alpha up to 0.42.
- ✓ **Lifted black** `#141518`, never `#000`.
- The first frame is the thumbnail, so the title is already rising at frame 0.

## Narration script
- At most 3.5 words/s. Kokoro at speed 1.08 runs about 2.6 words/s.
- One clause per beat. Each full stop is a possible cut point. No commas nested inside commas.
- Write numbers as spoken ("seventy-four to eighty-one percent") and initialisms spaced out ("G L M", "M C P").
  - The screen shows the exact figure; the voice may round, but only toward the less impressive number.
- Use the artifact's own provenance tags on screen (estimate, inferred) wherever the source marks them.

## Sound (`tts/sfx.py`, `src/fx.tsx`)
- ✓ **Everything tonal in one key** (A minor pentatonic). Pops rise in pitch across a group: `popFor(i)`.
- ✓ **One cue per event, not per element.** Six cards landing get two or three quiet pops. Continuous motion is silent: accent, don't narrate.
- Which sound for which event:
  - whoosh: under a cut (rotate the three variants)
  - tick: a state flip
  - pop: an arrival
  - chime: a key reveal (sparingly)
  - impact: once, on the title
  - riser: once, ending exactly on the closing line
  - sub: on the closing line
- **Gains:**
  - supporting cues 0.13–0.2
  - hero cues 0.25–0.5
  - every asset within 15 dB of the narration's mean level, or no volume setting will make it audible
- ✓ **Music bed:** about 10 dB under the voice between lines, ducked another 6 dB while the voice speaks (ramp 0.1 s before, release 0.2 s after).
- ✓ **Master** to −14 LUFS integrated, ≤ −1 dBTP, with two-pass `loudnorm` and `linear=true` (`tts/master.py`).
