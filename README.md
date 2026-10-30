# narrated-explainer-video

An agent skill that turns a document, report, spec or idea into a narrated motion-graphics explainer (MP4).

- **Remotion** for the video, with word-locked reveals: scene elements cue off the exact narrated word.
- **Kokoro** text-to-speech, running locally. Whisper re-transcribes each clip to catch mispronunciations.
- **Synthesized SFX and a music bed** that ducks under the voice.
- **A critic pass** over contact sheets before the final render.
- **A −14 LUFS master** (≤ −1.5 dBTP).

Everything runs on your machine. It needs no API keys, and the script stays local.

## Install

```bash
npx skills add anishthite/narrated-explainer-video
```

Or clone it into your agent's skills folder:

```bash
git clone https://github.com/anishthite/narrated-explainer-video ~/.claude/skills/narrated-explainer-video
```

Then ask your agent to "make an explainer video from <doc>".

## Requirements

- Node 18+ and ffmpeg
- [uv](https://github.com/astral-sh/uv) with Python 3.12 (for Kokoro, faster-whisper and the audio scripts)

## Layout

| Path | What's in it |
|---|---|
| `SKILL.md` | The pipeline the agent follows: steps, commands, gotchas |
| `template/` | The Remotion project to copy for each video, plus the `tts/` voice, SFX, QA and mastering scripts |
| `reference/motion-rules.md` | Motion rules with numbers: easings, springs, pacing, type, audio |
| `reference/critic-prompt.md` | The prompt for the read-only reviewer sub-agent |
| `reference/motion-repos.md` | The 15 motion-design repos the rules were distilled from |

The brand tokens in `template/src/theme.ts` are a neutral dark palette. Swap them for your own brand.
