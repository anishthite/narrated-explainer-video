import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from './theme';
import {E, prog} from './ui';
import {CHAPTERS, SCENES, STARTS, TOTAL, VO_SPANS} from './timeline';

// ── Sound ────────────────────────────────────────────────────────────────────
export type SfxName =
  | 'pop0' | 'pop1' | 'pop2' | 'pop3' | 'pop4' | 'pop5'
  | 'tick' | 'whoosh0' | 'whoosh1' | 'whoosh2'
  | 'chime' | 'impact' | 'sub' | 'riser' | 'shimmer';

// One cue per event. `at` is the frame the visual lands; the transient leads it by a frame.
export const Sfx: React.FC<{at: number; name: SfxName; vol?: number; len?: number}> = ({at, name, vol = 0.4, len = 90}) => (
  <Sequence from={Math.max(0, Math.round(at) - 1)} durationInFrames={len} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
  </Sequence>
);

// Pentatonic pops rising across a staggered group.
export const popFor = (i: number) => `pop${Math.min(5, i)}` as SfxName;

// Bed sits ~10 dB under the voice between lines and ducks another 6 dB while she speaks,
// ramping 0.1 s before each line and releasing 0.2 s after.
const BED = 0.34;
const duckAt = (f: number) => {
  let d = 0;
  for (const [a, b] of VO_SPANS) {
    if (f < a - 3 || f > b + 6) continue;
    const v = f < a ? (f - (a - 3)) / 3 : f > b ? 1 - (f - b) / 6 : 1;
    d = Math.max(d, v);
  }
  return d;
};

export const MusicBed: React.FC = () => (
  <Audio
    src={staticFile('music/bed.wav')}
    volume={(f) => {
      const fadeIn = interpolate(f, [0, 45], [0, 1], {extrapolateRight: 'clamp'});
      const fadeOut = interpolate(f, [TOTAL - 120, TOTAL - 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      return BED * fadeIn * fadeOut * (1 - 0.5 * duckAt(f));
    }}
  />
);

// ── Picture: everything that stays put across cuts ───────────────────────────
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 30;
  const gx = 74 + Math.sin(s / 3) * 6;
  const gy = 20 + Math.cos(s / 3.7) * 5;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${C.line} 1.2px, transparent 1.2px)`,
          backgroundSize: '36px 36px',
          backgroundPosition: `${-s * 4}px ${-s * 7}px`,
          opacity: 0.5,
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 45%, black 30%, transparent 100%)',
        }}
      />
      <AbsoluteFill style={{background: `radial-gradient(circle at ${gx}% ${gy}%, ${C.yellow}12 0%, transparent 40%)`}} />
    </AbsoluteFill>
  );
};

// Grain reseeded at 15 Hz (every 2 frames), then a soft vignette. Felt, not seen.
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 97;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, opacity: 0.075, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 85% 85% at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)'}}
      />
    </AbsoluteFill>
  );
};

// The chapter rail persists across cuts; the current bar fills with the chapter's progress.
export const ChapterRail: React.FC = () => {
  const f = useCurrentFrame();
  let i = 0;
  STARTS.forEach((s, k) => {
    if (f >= s + 10) i = k;
  });
  const scene = SCENES[i];
  const chapter = scene.chapter ? CHAPTERS.indexOf(scene.chapter) : -1;
  // Visible from the first chaptered scene through the last one.
  const first = SCENES.findIndex((s) => s.chapter);
  const last = SCENES.map((s) => !!s.chapter).lastIndexOf(true);
  if (first < 0) return null;
  const vis = Math.min(prog(f, STARTS[first], 20), 1 - prog(f, STARTS[last] + SCENES[last].dur - 16, 16, E.exit));
  // Progress through the chapter, spanning every scene that shares it.
  const span = SCENES.map((s, k) => ({k, s})).filter(({s}) => !!s.chapter && s.chapter === scene.chapter);
  const a = span.length ? STARTS[span[0].k] : 0;
  const b = span.length ? STARTS[span[span.length - 1].k] + span[span.length - 1].s.dur : 1;
  const fill = interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 120, right: 120, bottom: 48, display: 'flex', gap: 10, opacity: vis}}>
      {CHAPTERS.map((c, k) => (
        <div key={c} style={{flex: 1}}>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 16,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: k === chapter ? C.white : C.gray,
              opacity: k === chapter ? 1 : 0.55,
              marginBottom: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </div>
          <div style={{height: 3, borderRadius: 2, background: C.line, overflow: 'hidden'}}>
            <div
              style={{
                height: 3,
                width: `${k < chapter ? 100 : k === chapter ? fill * 100 : 0}%`,
                background: k === chapter ? C.yellow : C.gray,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
