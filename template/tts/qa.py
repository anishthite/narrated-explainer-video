"""Transcribe every narration clip with Whisper and flag words that differ from the script."""
import difflib, json, pathlib, re, warnings
warnings.filterwarnings("ignore")
from faster_whisper import WhisperModel
import soundfile as sf
from scipy.signal import resample_poly

ROOT = pathlib.Path(__file__).resolve().parent.parent
script = json.loads((ROOT / "src/narration.json").read_text())
vo = json.loads((ROOT / "src/vo.json").read_text())
model = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", " ", s.lower().replace("-", " ")).split()
flagged = 0
for scene in script["scenes"]:
    for b in scene["beats"]:
        key = f"{scene['id']}__{b['id']}"
        if key not in vo:
            continue
        audio, sr = sf.read(ROOT / "public" / vo[key]["file"], dtype="float32")
        segs, _ = model.transcribe(resample_poly(audio, 2, 3).astype("float32"), language="en", beam_size=5)
        heard = " ".join(s.text.strip() for s in segs)
        a, h = norm(b["text"]), norm(heard)
        diffs = [(a[i1:i2], h[j1:j2]) for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, h).get_opcodes() if op != "equal"]
        if diffs:
            flagged += 1
            print(f"{key}: " + " | ".join(f"{' '.join(x) or '∅'} → {' '.join(y) or '∅'}" for x, y in diffs))
print(f"{flagged} clips with differences")
