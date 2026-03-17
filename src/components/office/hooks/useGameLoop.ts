'use client';

import { useEffect, useRef } from 'react';
import { createGameLoop, type GameLoopFrame } from '../engine/gameLoop';

export function useGameLoop(onFrame: (frame: GameLoopFrame) => void) {
  const onFrameRef = useRef(onFrame);

  onFrameRef.current = onFrame;

  useEffect(() => {
    const loop = createGameLoop((frame) => {
      onFrameRef.current(frame);
    });

    loop.start();
    return () => loop.stop();
  }, []);
}
