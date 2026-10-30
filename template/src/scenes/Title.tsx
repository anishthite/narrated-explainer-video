import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {Appear, E, MaskRise, Scene, prog, useCues} from '../ui';
import {Sfx, popFor} from '../fx';

const display: React.CSSProperties = {
  fontFamily: F.display,
  fontWeight: 900,
  lineHeight: 0.95,
  letterSpacing: '-0.02em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export const Title: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const c = useCues();
  return (
    <Scene dur={dur} camera="push">
      <div style={{position: 'absolute', left: 120, right: 120, top: 320}}>
        <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.yellow}}>
          Kicker · what this is
        </div>
        {/* Already rising on frame 0, so the first frame (the thumbnail) is never empty. */}
        <MaskRise at={-8} dur={24} style={{marginTop: 24}}>
          <div style={{...display, fontSize: 168}}>The Title</div>
        </MaskRise>
        <div style={{height: 4, width: `${prog(f, 14, 34, E.move) * 100}%`, background: 'rgba(246,248,250,0.4)', marginTop: 26}} />
        <Appear at={c.w('intro', 'what')} style={{marginTop: 34}}>
          <div style={{fontSize: 40, letterSpacing: '-0.012em', maxWidth: 1400}}>What the system does, and how it really works.</div>
        </Appear>
      </div>
      <Sfx at={2} name="impact" vol={0.42} len={60} />
    </Scene>
  );
};

export const Outro: React.FC<{dur: number}> = ({dur}) => {
  const c = useCues();
  const lines: [string, string, string][] = [
    ['o1', 'Models draft.', C.white],
    ['o2', 'Code picks.', C.white],
    ['o3', 'You review.', C.yellow],
  ];
  return (
    <Scene dur={dur} camera="push">
      <div style={{position: 'absolute', left: 120, top: 300}}>
        {lines.map(([id, t, color]) => (
          <MaskRise key={id} at={c.at(id) - 3} dur={18}>
            <div style={{...display, fontSize: 140, lineHeight: 1.02, color}}>{t}</div>
          </MaskRise>
        ))}
      </div>
      {lines.slice(0, -1).map(([id], i) => (
        <Sfx key={id} at={c.at(id) + 4} name={popFor(i * 2)} vol={0.16} />
      ))}
      <Sfx at={c.at(lines[lines.length - 1][0]) + 4} name="sub" vol={0.5} len={60} />
    </Scene>
  );
};
