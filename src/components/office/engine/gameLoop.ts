export type GameLoopFrame = {
  time: number;
  delta: number;
  frame: number;
};

export function createGameLoop(onFrame: (frame: GameLoopFrame) => void) {
  let animationFrame = 0;
  let frame = 0;
  let previous = 0;
  let running = false;

  const tick = (time: number) => {
    if (!running) return;

    if (previous === 0) previous = time;
    const delta = Math.min((time - previous) / 1000, 1 / 20);
    previous = time;
    frame += 1;

    onFrame({ time, delta, frame });
    animationFrame = window.requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      previous = 0;
      animationFrame = window.requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(animationFrame);
    },
  };
}

