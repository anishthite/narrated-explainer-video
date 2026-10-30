import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';
import {CHAPTERS} from './timeline';
import type {Cues} from './timeline';

// ── Motion vocabulary ────────────────────────────────────────────────────────
// Entrances decelerate (expo-out), exits accelerate and run shorter, moves are
// symmetric, and values that "land" (bars, counters) overshoot a touch.
export const E = {
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  exit: Easing.bezier(0.7, 0, 0.84, 0),
  move: Easing.bezier(0.65, 0, 0.35, 1),
  land: Easing.bezier(0.55, 0, 0.2, 1.12),
  linear: (x: number) => x,
};
export const easeOut = E.enter;
export const easeInOut = E.move;

// Springs with damping ratio ≥ 0.72: no cartoon bounce in a report.
export const SPRING = {
  card: {damping: 26, stiffness: 170, mass: 1}, // ratio ≈ 1.0
  chip: {damping: 20, stiffness: 220, mass: 0.8}, // ratio ≈ 0.75, a hint of settle
  heavy: {damping: 24, stiffness: 120, mass: 1}, // big type, no overshoot
};

export const prog = (frame: number, start: number, dur = 14, easing = E.enter) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

export const useSpring = (at: number, config = SPRING.card) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - at, fps, config});
};

// Opacity + short travel + a third channel (scale), on a spring.
export const Appear: React.FC<{
  at: number;
  y?: number;
  x?: number;
  scale?: number;
  spring?: keyof typeof SPRING;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({at, y = 18, x = 0, scale = 0.97, spring: kind = 'card', style, children}) => {
  const t = useSpring(at, SPRING[kind]);
  const o = Math.min(1, Math.max(0, t * 1.6));
  // Compose with any opacity/transform the caller passes (e.g. a dim), never replace the animation.
  const {opacity: so = 1, transform: st, ...rest} = style ?? {};
  return (
    <div
      style={{
        ...rest,
        opacity: o * Number(so),
        transform: `translate(${(1 - t) * x}px, ${(1 - t) * y}px) scale(${scale + (1 - scale) * t})${st ? ` ${st}` : ''}`,
      }}
    >
      {children}
    </div>
  );
};

// Type rises out of a mask instead of fading in.
export const MaskRise: React.FC<{at: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at,
  dur = 22,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  const k = prog(f, at, dur);
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.12em', ...style}}>
      <div style={{transform: `translateY(${(1 - k) * 112}%) rotate(${(1 - k) * 3}deg)`, transformOrigin: '0% 100%'}}>
        {children}
      </div>
    </div>
  );
};

// A word group inside a line that rises out of its own mask.
export const InlineRise: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const f = useCurrentFrame();
  const k = prog(f, at, 18);
  return (
    <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.12em'}}>
      <span style={{display: 'inline-block', transform: `translateY(${(1 - k) * 112}%)`}}>{children}</span>
    </span>
  );
};

// Spent items step back when the narration moves on.
export const useDim = (from: number | undefined, to = 0.4, dur = 12) => {
  const f = useCurrentFrame();
  if (from === undefined) return 1;
  return 1 - (1 - to) * prog(f, from, dur, E.move);
};

// Counts toward `to` from frame `at`; short counts ease, long ones run linear.
export const useCount = (to: number, at: number, dur = 21, from = 0) => {
  const f = useCurrentFrame();
  return from + (to - from) * prog(f, at, dur, dur > 60 ? E.linear : E.enter);
};

// ── Cues ─────────────────────────────────────────────────────────────────────
export const CueContext = createContext<Cues | null>(null);
export const useCues = () => {
  const c = useContext(CueContext);
  if (!c) throw new Error('useCues outside a scene');
  return c;
};

// ── Scene chrome ─────────────────────────────────────────────────────────────
export type Camera = 'push' | 'drift' | 'still';

// Kicker, masked title, and one slow camera move on the content. The backdrop,
// grain and chapter rail live outside the cuts, so only content transitions.
export const Scene: React.FC<{
  dur: number;
  chapter?: string; // from narration.json; shows the kicker "NN — Chapter"
  title?: React.ReactNode;
  sub?: React.ReactNode;
  camera?: Camera;
  children: React.ReactNode;
}> = ({dur, chapter, title, sub, camera = 'still', children}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E.move});
  const cam =
    camera === 'push'
      ? `scale(${1 + 0.022 * p})`
      : camera === 'drift'
        ? `translate(${-14 * p}px, ${-6 * p}px) scale(1.008)`
        : 'none';
  const head = prog(f, 2, 16);
  return (
    <AbsoluteFill style={{fontFamily: F.sans, color: C.white}}>
      <AbsoluteFill style={{transform: cam, transformOrigin: '50% 42%'}}>
        {chapter !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 84,
              fontFamily: F.mono,
              fontSize: 22,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: C.yellow,
              opacity: head,
              transform: `translateX(${(1 - head) * -14}px)`,
            }}
          >
            {String(CHAPTERS.indexOf(chapter) + 1).padStart(2, '0')} — {chapter}
          </div>
        )}
        {title && (
          <div style={{position: 'absolute', left: 120, right: 120, top: 120}}>
            <MaskRise at={4} dur={20}>
              <div style={{fontSize: 62, fontWeight: 600, letterSpacing: '-0.028em', lineHeight: 1.08}}>{title}</div>
            </MaskRise>
            {sub && (
              <Appear at={12} y={10} scale={1}>
                <div style={{fontSize: 28, color: C.dim, letterSpacing: '-0.005em', marginTop: 10}}>{sub}</div>
              </Appear>
            )}
          </div>
        )}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Chip: React.FC<{
  color?: string;
  outline?: boolean;
  mono?: boolean;
  size?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({color = C.dim, outline, mono, size = 20, style, children}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: `${size * 0.3}px ${size * 0.7}px`,
      borderRadius: 999,
      fontFamily: mono ? F.mono : F.sans,
      fontSize: size,
      fontWeight: mono ? 400 : 600,
      color: outline ? color : C.bg,
      background: outline ? `${color}14` : color,
      border: `1.5px solid ${outline ? `${color}88` : color}`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

// The artifact's own provenance tags
export const Tag: React.FC<{kind: 'estimate' | 'inferred' | 'invoice' | 'measured'}> = ({kind}) => (
  <span
    style={{
      fontFamily: F.mono,
      fontSize: 15,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: C.gray,
      border: `1px dashed ${C.gray}`,
      borderRadius: 6,
      padding: '2px 8px',
      marginLeft: 10,
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
    }}
  >
    {kind}
  </span>
);

export const Dot: React.FC<{color: string; size?: number; style?: React.CSSProperties}> = ({color, size = 14, style}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      ...style,
    }}
  />
);

export const Panel: React.FC<{style?: React.CSSProperties; accent?: string; children: React.ReactNode}> = ({
  style,
  accent,
  children,
}) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${C.panel2} 0%, ${C.panel} 100%)`,
      border: `1px solid ${C.line}`,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${C.line}`,
      borderRadius: 18,
      padding: 28,
      boxShadow: '0 24px 60px -30px rgba(0,0,0,0.8)',
      ...style,
    }}
  >
    {children}
  </div>
);
