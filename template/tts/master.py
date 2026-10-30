"""Two-pass loudness master: -14 LUFS integrated, -1.5 dBTP, video stream copied untouched.

usage: master.py <in.mp4> <out.mp4>
"""
import json
import re
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
TARGET = "I=-14:TP=-1.5:LRA=11"

probe = subprocess.run(
    ["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
    capture_output=True,
    text=True,
    check=True,
)
m = json.loads(re.findall(r"\{[^{}]*\}", probe.stderr)[-1])
second = (
    f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
    f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
)
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-c:v", "copy", "-af", second, "-ar", "48000", "-c:a", "aac", "-b:a", "256k",
     "-movflags", "+faststart", dst],
    check=True,
)
check = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", dst, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
s = check.stderr[check.stderr.rfind("Summary:"):]
print("in:", m["input_i"], "LUFS", m["input_tp"], "dBTP")
print("out:", re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1), "LUFS,", re.search(r"Peak:\s+(-?[\d.]+) dBFS", s).group(1), "dBTP")
