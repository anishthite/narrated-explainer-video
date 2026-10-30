"""Mirror of src/timeline.ts: print scene starts/lengths and write out/timeline.json.

usage: timeline.py            -> table + out/timeline.json (used by qa_video.py)
       timeline.py --ends     -> "scene:frame" for each scene's last spoken frame (for `remotion still`)
       timeline.py --beats    -> out/beats.txt: narration lines with scene times (for the critic)
Keep LEAD/GAP/TAIL/default cut in sync with src/timeline.ts.
"""
import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAD, GAP, TAIL, CUT = 22, 9, 26, 16
n = json.loads((ROOT / "src/narration.json").read_text())
vo = json.loads((ROOT / "src/vo.json").read_text())

out, start, prev = {}, 0, None
for s in n["scenes"]:
    t = s.get("lead", LEAD)
    beats = {}
    for j, b in enumerate(s["beats"]):
        if j:
            t += b.get("gap", s.get("gap", GAP))
        length = b["silent"] if "silent" in b else math.ceil(vo[f"{s['id']}__{b['id']}"]["sec"] * 30)
        beats[b["id"]] = (t, t + length)
        t += length
    dur = max(s["minDur"], t + s.get("tail", TAIL))
    if prev:
        start = prev["start"] + prev["dur"] - prev["cut"]
    prev = out[s["id"]] = {"start": start, "dur": dur, "cut": s.get("cut", {}).get("dur", CUT), "beats": beats}

total = prev["start"] + prev["dur"]
if "--beats" in sys.argv:
    lines = []
    for s in n["scenes"]:
        v = out[s["id"]]
        lines.append(f"## {s['id']}  (scene length {v['dur'] / 30:.1f}s; sheet timestamps = scene time minus 0.5s)")
        for b in s["beats"]:
            a, e = v["beats"][b["id"]]
            lines.append(f"  {a / 30:5.1f}-{e / 30:5.1f}s  {b['id']}: {b.get('text', '(silent beat)')}")
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out/beats.txt").write_text("\n".join(lines) + "\n")
    print(f"wrote out/beats.txt ({len(lines)} lines)")
elif "--ends" in sys.argv:
    print(" ".join(f"{k}:{v['start'] + max(e for _, e in v['beats'].values()) - 4}" for k, v in out.items()))
else:
    for k, v in out.items():
        print(f"{k:12s} start={v['start']:6d}  dur={v['dur']:5d} ({v['dur'] / 30:5.1f}s)")
    print(f"TOTAL {total} frames = {total / 30 // 60:.0f}:{total / 30 % 60:04.1f}")
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out/timeline.json").write_text(json.dumps(out))
