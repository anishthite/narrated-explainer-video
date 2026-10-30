"""Synthesize every narration beat in src/narration.json with Kokoro.

Writes public/vo/<scene>__<beat>.<hash>.wav (cached by voice, speed and text)
and src/vo.json with each clip's file and length, which src/timeline.ts reads.
"""
import hashlib
import json
import pathlib
import warnings

import numpy as np
import soundfile as sf

warnings.filterwarnings("ignore")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "narration.json"
OUT_DIR = ROOT / "public" / "vo"
MANIFEST = ROOT / "src" / "vo.json"
SR = 24000
TARGET_RMS_DB = -19.0
PEAK_DB = -1.5


def trim(audio: np.ndarray, thresh: float = 0.004, pad: float = 0.04) -> tuple[np.ndarray, int]:
    loud = np.flatnonzero(np.abs(audio) > thresh)
    if not len(loud):
        return audio, 0
    p = int(pad * SR)
    start = max(0, loud[0] - p)
    return audio[start : loud[-1] + p], start


def normalize(audio: np.ndarray) -> np.ndarray:
    rms = np.sqrt(np.mean(audio**2)) + 1e-9
    audio = audio * (10 ** (TARGET_RMS_DB / 20) / rms)
    peak = np.max(np.abs(audio)) + 1e-9
    limit = 10 ** (PEAK_DB / 20)
    return audio * min(1.0, limit / peak)


def main() -> None:
    script = json.loads(SCRIPT.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pipe = None
    manifest = {}
    for scene in script["scenes"]:
        for beat in scene["beats"]:
            if "text" not in beat:
                continue
            key = f"{scene['id']}__{beat['id']}"
            v = script["voices"][beat.get("voice", "narrator")]
            digest = hashlib.sha1(f"{v['voice']}|{v['speed']}|{beat['text']}".encode()).hexdigest()[:10]
            path = OUT_DIR / f"{key}.{digest}.wav"
            words_path = path.with_suffix(".words.json")
            if not (path.exists() and words_path.exists()):
                if pipe is None:
                    from kokoro import KPipeline

                    pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
                chunks, words, offset = [], [], 0.0
                for result in pipe(beat["text"], voice=v["voice"], speed=v["speed"]):
                    a = result.audio.numpy() if hasattr(result.audio, "numpy") else result.audio
                    for t in result.tokens or []:
                        if t.start_ts is not None and any(c.isalnum() for c in t.text):
                            words.append([t.text, offset + t.start_ts])
                    chunks.append(a)
                    offset += len(a) / SR
                audio, cut = trim(np.concatenate(chunks).astype(np.float32))
                audio = normalize(audio)
                sf.write(path, audio, SR, subtype="PCM_16")
                words_path.write_text(json.dumps([[w, round(max(0.0, t - cut / SR), 3)] for w, t in words]))
                print(f"synth {key} ({len(audio) / SR:.2f}s)")
            info = sf.info(path)
            manifest[key] = {
                "file": f"vo/{path.name}",
                "sec": round(info.frames / info.samplerate, 3),
                "words": json.loads(words_path.read_text()),
            }
    keep = {pathlib.Path(m["file"]).name for m in manifest.values()}
    keep |= {n.replace(".wav", ".words.json") for n in keep}
    for stale in [*OUT_DIR.glob("*.wav"), *OUT_DIR.glob("*.json")]:
        if stale.name not in keep:
            stale.unlink()
    MANIFEST.write_text(json.dumps(manifest) + "\n")
    total = sum(m["sec"] for m in manifest.values())
    print(f"{len(manifest)} clips, {total:.1f}s of speech -> {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
