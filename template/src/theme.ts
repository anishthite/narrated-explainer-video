import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Brand tokens. Defaults are a neutral dark palette; swap for the brand at hand.
// Rule: the accent means one thing. Use it for the current focus only.
export const C = {
  bg: '#141518', // lifted black, never #000
  panel: '#1E1F21',
  panel2: '#26282C',
  line: '#34373D',
  white: '#F6F8FA',
  gray: '#787C84',
  dim: '#A9ADB5',
  yellow: '#FFD43B', // the accent
  sky: '#24AFE2',
  blue: '#0159A2',
  cyan: '#4DDDED',
  ice: '#99EBEB',
  red: '#FF5D5D',
  green: '#5EE6A8',
  amber: '#FFB547',
};

export const F = {
  sans: '"Brand Sans", -apple-system, system-ui, sans-serif',
  display: '"Brand Display", "Brand Sans", -apple-system, system-ui, sans-serif',
  mono: '"SF Mono", Menlo, ui-monospace, monospace',
};

export const FPS = 30;

// Drop brand .woff2 files in public/fonts and list them here: a sans at 400/600 and a heavy
// display cut at 900.
const FONT_FILES: {family: string; file: string; weight: string}[] = [
  // {family: 'Brand Sans', file: 'Sans-Regular.woff2', weight: '400'},
  // {family: 'Brand Sans', file: 'Sans-Semibold.woff2', weight: '600'},
  // {family: 'Brand Display', file: 'Display-Black.woff2', weight: '900'},
];

export const loadFonts = () =>
  Promise.all(FONT_FILES.map((x) => loadFont({family: x.family, url: staticFile(`fonts/${x.file}`), weight: x.weight})));
