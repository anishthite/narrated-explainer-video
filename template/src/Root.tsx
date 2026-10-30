import React from 'react';
import {Composition} from 'remotion';
import {FPS} from './theme';
import {TOTAL} from './timeline';
import {Explainer} from './Video';

export const Root: React.FC = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
