import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {C, loadFonts} from './theme';
import {dip} from './dip';
import {CUTS, Cut, SCENES, STARTS, makeCues} from './timeline';
import {CueContext, E} from './ui';
import {Backdrop, ChapterRail, Grade, MusicBed, Sfx, SfxName} from './fx';
import {Example} from './scenes/Example';
import {Outro, Title} from './scenes/Title';

// One component per scene id in narration.json.
const COMPONENTS: Record<string, React.FC<{dur: number}>> = {
  title: Title,
  example: Example,
  outro: Outro,
};

const VOICE_VOL: Record<string, number> = {narrator: 1, robot: 0.85};

// Presentations differ in prop types; the series only needs the shared shape.
const presentation = (c: Cut) =>
  (c.kind === 'slide' ? slide({direction: c.dir}) : c.kind === 'wipe' ? wipe({direction: c.dir}) : dip()) as ReturnType<typeof dip>;

export const Explainer: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);

  const last = SCENES.length - 1;
  const outroFirst = Object.values(SCENES[last].beats)[0];

  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Backdrop />
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const S = COMPONENTS[s.id];
          if (!S) throw new Error(`No component for scene "${s.id}" in Video.tsx`);
          const items = [
            <TransitionSeries.Sequence key={s.id} durationInFrames={s.dur}>
              <CueContext.Provider value={makeCues(s)}>
                <S dur={s.dur} />
                {Object.values(s.beats)
                  .filter((b) => b.file)
                  .map((b) => (
                    <Sequence key={b.id} from={b.at} layout="none">
                      <Audio src={staticFile(b.file!)} volume={VOICE_VOL[b.voice] ?? 1} />
                    </Sequence>
                  ))}
              </CueContext.Provider>
            </TransitionSeries.Sequence>,
          ];
          if (i < CUTS.length) {
            items.push(
              <TransitionSeries.Transition
                key={`cut-${i}`}
                presentation={presentation(CUTS[i])}
                timing={linearTiming({durationInFrames: CUTS[i].dur, easing: E.move})}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      <ChapterRail />
      <Grade />
      <MusicBed />
      {/* A whoosh under every cut (rotating variants); one riser per video, ending on the closing line. */}
      {CUTS.map((c, i) => (
        <Sfx key={`w${i}`} at={STARTS[i + 1] + 2} name={`whoosh${i % 3}` as SfxName} vol={c.kind === 'dip' ? 0.16 : 0.26} />
      ))}
      {outroFirst && <Sfx at={STARTS[last] + outroFirst.at - 64} name="riser" vol={0.32} len={70} />}
    </AbsoluteFill>
  );
};
