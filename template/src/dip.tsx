import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {E} from './ui';

// Sequential cross-dip: the outgoing scene clears in the first half (accelerating),
// the incoming one rises in during the second (decelerating), so two titles never overprint.
const Dip: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const entering = presentationDirection === 'entering';
  const k = entering
    ? interpolate(p, [0.42, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E.enter})
    : interpolate(p, [0, 0.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E.exit});
  const y = entering ? (1 - k) * 14 : (1 - k) * -10;
  return <AbsoluteFill style={{opacity: k, transform: `translateY(${y}px)`}}>{children}</AbsoluteFill>;
};

export const dip = (): TransitionPresentation<Record<string, never>> => ({component: Dip, props: {}});
