// One timing source for picture and sound. Scene lengths, narration beats, word cues,
// cuts and chapters all come from src/narration.json (the script) and src/vo.json
// (clip lengths + word times, written by tts/gen.py). tts/timeline.py mirrors this math.
import narration from './narration.json';
import voJson from './vo.json';
import {FPS} from './theme';

type Vo = Record<string, {file: string; sec: number; words: [string, number][]}>;
const vo = voJson as unknown as Vo;

export type Cut = {kind: 'dip' | 'slide' | 'wipe'; dir?: 'from-right' | 'from-left' | 'from-bottom' | 'from-top'; dur: number};
type BeatDef = {id: string; text?: string; voice?: string; silent?: number; gap?: number};
type SceneDef = {
  id: string;
  chapter?: string;
  minDur: number;
  lead?: number;
  gap?: number;
  tail?: number;
  cut?: Cut; // the cut into the NEXT scene
  beats: BeatDef[];
};

export type Beat = {id: string; at: number; end: number; file?: string; voice: string; words: {w: string; f: number}[]};
export type SceneTiming = {id: string; chapter?: string; dur: number; beats: Record<string, Beat>};

export const LEAD = 22; // first line starts after the incoming cut settles (must be ≥ the cut length)
export const GAP = 9; // breath between lines
export const TAIL = 26; // hold, still, after the last line before the cut
const DEFAULT_CUT: Cut = {kind: 'dip', dur: 16};

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const defs = narration.scenes as SceneDef[];

export const SCENES: SceneTiming[] = defs.map((s) => {
  let t = s.lead ?? LEAD;
  const beats: Record<string, Beat> = {};
  s.beats.forEach((b, i) => {
    if (i > 0) t += b.gap ?? s.gap ?? GAP;
    const key = `${s.id}__${b.id}`;
    const clip = b.silent === undefined ? vo[key] : undefined;
    if (b.silent === undefined && !clip) throw new Error(`No narration clip for ${key}; run tts/gen.py`);
    const len = b.silent ?? Math.ceil(clip!.sec * FPS);
    beats[b.id] = {
      id: b.id,
      at: t,
      end: t + len,
      file: clip?.file,
      voice: b.voice ?? 'narrator',
      words: (clip?.words ?? []).map(([w, sec]) => ({w: norm(w), f: t + Math.round(sec * FPS)})),
    };
    t += len;
  });
  return {id: s.id, chapter: s.chapter, dur: Math.max(s.minDur, t + (s.tail ?? TAIL)), beats};
});

export const CUTS: Cut[] = defs.slice(0, -1).map((s) => s.cut ?? DEFAULT_CUT);

// Chapters in story order (scenes without one — title, outro — hide the rail).
export const CHAPTERS: string[] = [...new Set(defs.map((s) => s.chapter).filter((c): c is string => !!c))];

export const STARTS: number[] = SCENES.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].dur - CUTS[i - 1].dur);
  return acc;
}, []);

export const TOTAL = STARTS[STARTS.length - 1] + SCENES[SCENES.length - 1].dur;

// Narration spans on the global timeline, for ducking the music bed.
export const VO_SPANS: [number, number][] = SCENES.flatMap((s, i) =>
  Object.values(s.beats)
    .filter((b) => b.file)
    .map((b) => [STARTS[i] + b.at, STARTS[i] + b.end] as [number, number]),
);

// Cue lookups used by scenes. Errors are loud on purpose: a renamed word must not silently drift.
export const makeCues = (scene: SceneTiming) => {
  const beat = (id: string) => {
    const b = scene.beats[id];
    if (!b) throw new Error(`Scene ${scene.id} has no beat "${id}"`);
    return b;
  };
  return {
    at: (id: string) => beat(id).at,
    end: (id: string) => beat(id).end,
    len: (id: string) => beat(id).end - beat(id).at,
    // Frame a word starts, minus `lead` frames so reading starts with the voice.
    // Exact matches win; prefix matches are the fallback. Use `nth` for repeated words.
    w: (id: string, word: string, nth = 0, lead = 1) => {
      const target = norm(word);
      const words = beat(id).words;
      const exact = words.filter((x) => x.w === target);
      const hits = exact.length ? exact : words.filter((x) => x.w.startsWith(target));
      if (!hits[nth]) throw new Error(`Beat ${scene.id}.${id} has no word "${word}" #${nth}`);
      return hits[nth].f - lead;
    },
    beat,
  };
};
export type Cues = ReturnType<typeof makeCues>;
