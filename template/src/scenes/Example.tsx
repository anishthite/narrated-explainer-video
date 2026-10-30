// Pattern reference: every reveal is cued to the word that names it (c.w), the claim bar
// lands with overshoot, counters are tabular, spent items step back (useDim), and each
// event gets at most one quiet sound.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {Appear, Chip, E, InlineRise, Panel, Scene, prog, useCount, useCues, useDim} from '../ui';
import {Sfx} from '../fx';

const BASE = 800;
const PX = 15;

const Bar: React.FC<{n: number; at: number; label: string; color: string; dashed?: boolean}> = ({n, at, label, color, dashed}) => {
  const f = useCurrentFrame();
  const t = prog(f, at, 20, E.land); // grows from the axis with a small overshoot
  const v = useCount(n, at, 20);
  return (
    <div style={{width: 200, position: 'relative', height: '100%'}}>
      <div style={{position: 'absolute', bottom: 1080 - BASE + n * PX * t + 12, width: '100%', textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 92, color, opacity: prog(f, at, 6), fontVariantNumeric: 'tabular-nums'}}>
        {Math.round(v)}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 1080 - BASE,
          width: '100%',
          height: n * PX,
          borderRadius: '12px 12px 0 0',
          background: dashed ? 'transparent' : color,
          border: dashed ? `2.5px dashed ${color}` : 'none',
          transform: `scaleY(${t})`, // never animate height
          transformOrigin: '50% 100%',
        }}
      />
      <div style={{position: 'absolute', top: BASE + 18, width: '100%', textAlign: 'center', fontSize: 22, fontWeight: 600, opacity: prog(f, at + 4, 12)}}>{label}</div>
    </div>
  );
};

export const Example: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const c = useCues();
  const at7 = c.w('plan', 'seven');
  const at27 = c.w('plan', 'twentyseven');
  const at10 = c.w('built', 'ten');
  const barsDim = useDim(c.at('cost') - 4, 0.5);
  const k = useCount(12, c.w('cost', 'twelve'), 16);
  return (
    <Scene
      dur={dur}
      chapter="Example"
      camera="push"
      title={
        <>
          “7 tools instead of 27.”{' '}
          <InlineRise at={at10 - 2}>
            As built: <span style={{color: C.yellow}}>10</span>.
          </InlineRise>
        </>
      }
    >
      <div style={{position: 'absolute', left: 140, top: 0, height: 1080, display: 'flex', gap: 64, opacity: barsDim}}>
        <Bar n={27} at={at27} label="before" color={C.gray} />
        <Bar n={7} at={at7} label="the plan" color={C.white} dashed />
        <Bar n={10} at={at10} label="as built" color={C.yellow} />
      </div>
      <div style={{position: 'absolute', left: 1010, right: 120, top: 300}}>
        <Appear at={c.w('built', 'seven')}>
          <Panel>
            <div style={{fontSize: 26, fontWeight: 600}}>The ten</div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14}}>
              {['Read', 'Edit', 'Bash'].map((t, i) => (
                <Appear key={t} at={c.w('built', 'seven') + 4 + i * 2} y={8} spring="chip">
                  <Chip outline mono color={C.dim} size={19}>{t}</Chip>
                </Appear>
              ))}
              <Appear at={c.w('built', 'ours')} y={8} spring="chip">
                <Chip outline mono color={C.yellow} size={19}>submit</Chip>
              </Appear>
            </div>
          </Panel>
        </Appear>
        <Appear at={c.at('cost')} style={{marginTop: 22}}>
          <Panel>
            <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 72, color: C.yellow, fontVariantNumeric: 'tabular-nums'}}>≈{Math.round(k)}k</span>
            <span style={{fontSize: 22, color: C.dim, marginLeft: 14}}>tokens of tool definitions</span>
          </Panel>
        </Appear>
      </div>
      <Sfx at={at7} name="pop2" vol={0.2} />
      <Sfx at={at27} name="pop0" vol={0.2} />
      <Sfx at={at10} name="pop4" vol={0.24} />
    </Scene>
  );
};
