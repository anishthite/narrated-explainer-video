"""QA a rendered cut: per-scene contact sheets plus a loudness report.

usage: qa_video.py <video.mp4> <timeline.json> <out_dir>
timeline.json maps scene id -> {start, dur} in frames (30 fps).
"""
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

FPS = 30
video, timeline, out = sys.argv[1], json.loads(pathlib.Path(sys.argv[2]).read_text()), pathlib.Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

# Contact sheets: one frame per second of each scene, 6 columns.
for sid, s in timeline.items():
    start, dur = s["start"] / FPS, s["dur"] / FPS
    n = int(dur)
    rows = (n + 5) // 6
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{start + 0.5:.2f}", "-t", f"{dur - 0.5:.2f}", "-i", video,
         "-vf", f"fps=1,scale=320:-1,drawtext=text='%{{pts\\:hms}}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5,tile=6x{rows}",
         "-frames:v", "1", str(out / f"sheet-{sid}.png")],
        check=True,
    )

# Loudness: integrated LUFS and true peak of the whole mix.
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"],
                   capture_output=True, text=True)
summary = r.stderr[r.stderr.rfind("Summary:"):]
lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
print(f"integrated {lufs.group(1) if lufs else '?'} LUFS, true peak {peak.group(1) if peak else '?'} dBFS")

# Short-term level in 100 ms windows, to compare speech against the gaps between lines.
pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.float32)
win = 1600
db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // win * win].reshape(-1, win) ** 2, axis=1)) + 1e-9)
print(f"100 ms windows: p90 {np.percentile(db, 90):.1f} dBFS (speech), p30 {np.percentile(db, 30):.1f} dBFS (gaps/bed), "
      f"min {db.min():.1f}, max {db.max():.1f}")
