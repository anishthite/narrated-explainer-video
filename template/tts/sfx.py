"""Synthesize the sound effects and the music bed into public/sfx and public/music.

Everything tonal sits in A minor pentatonic so the cues and the bed share one key.
Run once; outputs are deterministic (fixed seeds).
"""
import pathlib

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
SFX = ROOT / "public" / "sfx"
MUSIC = ROOT / "public" / "music"
SR = 48000
rng = np.random.default_rng(7)

# A minor pentatonic, A4 = 440
NOTE = {n: 440 * 2 ** (s / 12) for n, s in {"A4": 0, "C5": 3, "D5": 5, "E5": 7, "G5": 10, "A5": 12, "C6": 15, "E6": 19, "A6": 24}.items()}


def t(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def env(n: int, attack: float, decay: float) -> np.ndarray:
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(x - attack, 0) / decay)


def lp(x, hz, order=4):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def level(x: np.ndarray, peak_db: float) -> np.ndarray:
    return x * (10 ** (peak_db / 20) / (np.max(np.abs(x)) + 1e-9))


def save(path: pathlib.Path, x: np.ndarray) -> None:
    fade = min(len(x), int(0.004 * SR))
    x = x.copy()
    x[-fade:] *= np.linspace(1, 0, fade)
    sf.write(path, x.astype(np.float32), SR, subtype="PCM_16")


def pop(freq: float) -> np.ndarray:
    tt = t(0.22)
    f = freq * (1 + 0.06 * np.exp(-tt / 0.02))
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(phase) + 0.18 * np.sin(2 * phase)) * env(len(tt), 0.002, 0.07)
    click = bp(rng.standard_normal(len(tt)), 2000, 6000) * env(len(tt), 0.0005, 0.004) * 0.25
    return level(body + click, -4)


def tick() -> np.ndarray:
    tt = t(0.06)
    x = bp(rng.standard_normal(len(tt)), 2500, 7000) * env(len(tt), 0.0005, 0.006)
    x += 0.5 * np.sin(2 * np.pi * NOTE["E6"] * tt) * env(len(tt), 0.001, 0.012)
    return level(x, -6)


def whoosh(sec: float, lo: float, hi: float, seed: int) -> np.ndarray:
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    noise = r.standard_normal(n)
    # Sweep a band-pass centre up and back down in short blocks.
    block = 512
    out = np.zeros(n)
    peak_at = 0.62
    for i in range(0, n, block):
        p = i / n
        c = lo + (hi - lo) * (np.sin(np.pi * min(p / peak_at, 1) / 2) if p < peak_at else 1 - 0.55 * (p - peak_at) / (1 - peak_at))
        seg = noise[max(0, i - 2048) : i + block]
        out[i : i + block] = bp(seg, c * 0.55, min(c * 1.8, SR / 2 - 100))[-len(out[i : i + block]) :]
    x = np.arange(n) / n
    shape = np.where(x < peak_at, (x / peak_at) ** 2.2, ((1 - x) / (1 - peak_at)) ** 1.6)
    return level(lp(out * shape, 9000), -5)


def chime() -> np.ndarray:
    tt = t(1.6)
    x = np.zeros(len(tt))
    for f, a, d in [(NOTE["E6"], 1.0, 0.55), (NOTE["A6"], 0.6, 0.4), (NOTE["E6"] * 2.76, 0.12, 0.12), (NOTE["A5"], 0.35, 0.7)]:
        x += a * np.sin(2 * np.pi * f * tt) * env(len(tt), 0.004, d)
    return level(x, -6)


def impact() -> np.ndarray:
    tt = t(1.4)
    f = 55 + 45 * np.exp(-tt / 0.05)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.003, 0.45)
    body = np.sin(2 * np.pi * 110 * tt) * env(len(tt), 0.002, 0.08) * 0.4
    hit = lp(rng.standard_normal(len(tt)), 1800) * env(len(tt), 0.001, 0.05) * 0.6
    return level(sub + body + hit, -2)


def sub_swell() -> np.ndarray:
    tt = t(1.8)
    x = np.sin(2 * np.pi * 55 * tt) + 0.3 * np.sin(2 * np.pi * 110 * tt)
    return level(x * env(len(tt), 0.02, 0.6), -3)


def riser(sec: float = 2.2) -> np.ndarray:
    tt = t(sec)
    p = tt / sec
    noise = rng.standard_normal(len(tt))
    out = np.zeros(len(tt))
    block = 512
    for i in range(0, len(tt), block):
        c = 300 * (20 ** p[i])
        seg = noise[max(0, i - 2048) : i + block]
        out[i : i + block] = bp(seg, c * 0.6, min(c * 1.6, SR / 2 - 100))[-len(out[i : i + block]) :]
    glide = np.sin(2 * np.pi * np.cumsum(220 * 2 ** p) / SR) * 0.25
    return level((out + glide) * p**2.5, -6)


def shimmer() -> np.ndarray:
    tt = t(2.4)
    x = np.zeros(len(tt))
    for i, f in enumerate([NOTE["A5"] * 2, NOTE["C6"] * 2, NOTE["E6"] * 2, NOTE["E6"]]):
        trem = 0.6 + 0.4 * np.sin(2 * np.pi * (5 + i) * tt + i)
        x += np.sin(2 * np.pi * f * tt + i) * trem
    air = bp(rng.standard_normal(len(tt)), 5000, 12000) * 0.3
    shape = np.sin(np.pi * np.clip(tt / 2.4, 0, 1)) ** 1.5
    return level((x * 0.25 + air) * shape, -8)


def reverb(x: np.ndarray, sec: float = 2.2, mix: float = 0.28) -> np.ndarray:
    n = int(sec * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (sec / 5))
    ir = lp(ir, 5000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return (1 - mix) * x + mix * wet


def music_bed(minutes: float = 8.0) -> np.ndarray:
    """Slow pad in A minor (Am9 - Fmaj7 - Cmaj7 - G6), 8 s per chord, with a soft pluck pulse."""
    chords = [
        [45, 57, 60, 64, 67, 71],  # Am9
        [41, 57, 60, 64, 69],  # Fmaj7
        [48, 55, 59, 64, 67],  # Cmaj7
        [43, 55, 59, 62, 64],  # G6
    ]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    seg = 8.0
    n_total = int(minutes * 60 * SR)
    out = np.zeros((n_total, 2))
    n_seg = int(seg * SR)
    xfade = int(1.6 * SR)
    for k, start in enumerate(range(0, n_total, n_seg)):
        notes = chords[k % len(chords)]
        n = min(n_seg + xfade, n_total - start)
        tt = np.arange(n) / SR
        pad = np.zeros((n, 2))
        for m in notes:
            f = hz(m)
            for ch, det in ((0, -1), (1, 1)):
                for cents in (-7, 0, 7):
                    ff = f * 2 ** ((cents + det * 3) / 1200)
                    pad[:, ch] += (np.mod(ff * tt + rng.random(), 1.0) - 0.5) * (0.5 if m < 50 else 0.22)
        pad = np.stack([lp(pad[:, 0], 1100), lp(pad[:, 1], 1100)], axis=1)
        shape = np.minimum(np.clip(tt / 1.6, 0, 1), np.clip((n / SR - tt) / 1.6, 0, 1))
        pad *= shape[:, None]
        # Soft pluck on every beat at 75 BPM, walking the chord's upper notes.
        beat = 60 / 75
        for j in range(int(seg / beat)):
            m = notes[1 + (j % (len(notes) - 1))] + 12
            s = int(j * beat * SR)
            if s >= n:
                break
            pl = np.arange(min(int(0.9 * SR), n - s)) / SR
            note = np.sin(2 * np.pi * hz(m) * pl) * np.exp(-pl / 0.28) * 0.06
            pad[s : s + len(pl), 0] += note * (0.8 if j % 2 else 1.0)
            pad[s : s + len(pl), 1] += note * (1.0 if j % 2 else 0.8)
        out[start : start + n] += pad
    out = np.stack([reverb(out[:, 0], 3.0, 0.35), reverb(out[:, 1], 3.0, 0.35)], axis=1)
    rms = np.sqrt(np.mean(out**2))
    return out * (10 ** (-20 / 20) / rms)


def main() -> None:
    SFX.mkdir(parents=True, exist_ok=True)
    MUSIC.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(["A4", "C5", "D5", "E5", "G5", "A5"]):
        save(SFX / f"pop{i}.wav", reverb(pop(NOTE[name]), 0.6, 0.15))
    save(SFX / "tick.wav", tick())
    for i, (sec, lo, hi) in enumerate([(0.55, 250, 2600), (0.65, 200, 2200), (0.5, 320, 3200)]):
        save(SFX / f"whoosh{i}.wav", whoosh(sec, lo, hi, 11 + i))
    save(SFX / "chime.wav", reverb(chime(), 1.8, 0.3))
    save(SFX / "impact.wav", impact())
    save(SFX / "sub.wav", sub_swell())
    save(SFX / "riser.wav", riser())
    save(SFX / "shimmer.wav", reverb(shimmer(), 2.0, 0.3))
    bed = music_bed()
    sf.write(MUSIC / "bed.wav", np.clip(bed, -1, 1).astype(np.float32), SR, subtype="PCM_16")
    print("sfx:", sorted(p.name for p in SFX.glob("*.wav")))
    print(f"bed: {len(bed) / SR:.0f}s")


if __name__ == "__main__":
    main()
