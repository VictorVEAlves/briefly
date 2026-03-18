import type { CoreAgentConfig } from '../agents/agentConfig';
import type { AgentAnimationState, OfficeAgentMachine } from '../agents/agentState';
import { getAnimationFrame } from './animations';

const SKIN      = '#f2c299';
const SKIN_SHD  = '#d9a47a';
const OUTLINE   = '#0f172a';
const SHOE      = '#1e293b';
const SHOE_SOLE = '#334155';

/** Draw a single pixel-art pixel */
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

/** Darken a hex color by mixing with black */
function darken(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amount))},${Math.floor(g * (1 - amount))},${Math.floor(b * (1 - amount))})`;
}

/** Lighten a hex color */
function lighten(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))},${Math.min(255, Math.floor(g + (255 - g) * amount))},${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
}

function getArms(state: AgentAnimationState, frame: number) {
  if (state === 'type') {
    return frame % 2 === 0
      ? { leftY: 9, rightY: 11, leftX: -6, rightX: 4 }
      : { leftY: 11, rightY: 9, leftX: -6, rightX: 4 };
  }

  if (state === 'read') {
    return { leftY: 9, rightY: 9, leftX: -6, rightX: 4 };
  }

  if (state === 'celebrate') {
    return frame % 2 === 0
      ? { leftY: 1, rightY: 1, leftX: -8, rightX: 5 }
      : { leftY: 0, rightY: 2, leftX: -8, rightX: 5 };
  }

  if (state === 'error') {
    return { leftY: 2, rightY: 2, leftX: -8, rightX: 5 };
  }

  return { leftY: 9, rightY: 9, leftX: -6, rightX: 4 };
}

function getLegs(state: AgentAnimationState, frame: number) {
  if (state === 'walk') {
    const swing = frame % 2 === 0 ? 2 : -2;
    return { leftX: -2 + swing, rightX: 1 - swing, leftY: 0, rightY: 0 };
  }
  if (state === 'celebrate') {
    return { leftX: -4, rightX: 3, leftY: 0, rightY: 0 };
  }
  return { leftX: -2, rightX: 1, leftY: 0, rightY: 0 };
}

function getBounce(state: AgentAnimationState, frame: number) {
  if (state === 'walk') return frame % 2 === 0 ? 0 : -2;
  if (state === 'type') return frame % 2 === 0 ? 0 : 1;
  if (state === 'read') return frame === 1 ? -1 : 0;
  if (state === 'wait') return frame === 1 ? -1 : 0;
  if (state === 'celebrate') return -3;
  return frame === 2 ? -1 : 0;
}

export function drawAgentCharacter(
  ctx: CanvasRenderingContext2D,
  machine: OfficeAgentMachine,
  config: CoreAgentConfig,
  timeMs: number
) {
  const frame  = getAnimationFrame(machine.animation, timeMs, machine.blinkSeed);
  const bounce = getBounce(machine.animation, frame);
  const arms   = getArms(machine.animation, frame);
  const legs   = getLegs(machine.animation, frame);

  const ox = machine.pixel.x + 2;   // origin X
  const oy = machine.pixel.y + 4 + bounce; // origin Y

  const cloth     = config.clothingColor;
  const clothDark = darken(cloth, 0.28);
  const clothHi   = lighten(cloth, 0.18);
  const hairDark  = config.hairColor;
  const hairMid   = lighten(hairDark, 0.18);

  // ── Drop shadow ────────────────────────────────────────────
  ctx.fillStyle = 'rgba(8,8,15,0.32)';
  ctx.fillRect(ox, oy + 20, 12, 3);

  // ── Outline pass (draw full silhouette 1px bigger) ─────────
  ctx.fillStyle = OUTLINE;
  // head outline
  px(ctx, ox - 1, oy + 2,  14, 8,  OUTLINE);
  // body outline
  px(ctx, ox - 1, oy + 9,  14, 8,  OUTLINE);
  // left arm outline
  px(ctx, ox + arms.leftX - 1, oy + arms.leftY - 1, 5, 7, OUTLINE);
  // right arm outline
  px(ctx, ox + arms.rightX + 1, oy + arms.rightY - 1, 5, 7, OUTLINE);
  // left leg outline
  px(ctx, ox + 1 + legs.leftX - 1, oy + 16, 5, 7, OUTLINE);
  // right leg outline
  px(ctx, ox + 6 + legs.rightX - 1, oy + 16, 5, 7, OUTLINE);

  // ── Hair (3 rows with highlight) ───────────────────────────
  px(ctx, ox + 1, oy,       10, 1,  hairDark);   // top row
  px(ctx, ox,     oy + 1,   12, 3,  hairDark);   // main hair
  px(ctx, ox + 2, oy + 1,   5,  1,  hairMid);    // highlight streak
  px(ctx, ox,     oy + 3,   4,  2,  hairDark);   // side hair left
  px(ctx, ox + 8, oy + 3,   4,  2,  hairDark);   // side hair right

  // ── Head / face ────────────────────────────────────────────
  px(ctx, ox + 2, oy + 3,   8,  6,  SKIN);
  px(ctx, ox + 2, oy + 7,   8,  2,  SKIN_SHD);  // chin/jaw shadow

  // eyes
  const blinking = machine.animation === 'idle' && frame === 3;
  if (blinking) {
    // closed eyes (horizontal lines)
    px(ctx, ox + 3, oy + 5, 2, 1, SKIN_SHD);
    px(ctx, ox + 7, oy + 5, 2, 1, SKIN_SHD);
  } else {
    px(ctx, ox + 3, oy + 5, 2, 2, OUTLINE);   // left eye
    px(ctx, ox + 7, oy + 5, 2, 2, OUTLINE);   // right eye
    px(ctx, ox + 3, oy + 5, 1, 1, '#94a3b8'); // eye gleam L
    px(ctx, ox + 7, oy + 5, 1, 1, '#94a3b8'); // eye gleam R
  }

  // eyebrows
  if (machine.animation === 'error') {
    // furrowed/worried brows
    px(ctx, ox + 3, oy + 4, 2, 1, hairDark);
    px(ctx, ox + 7, oy + 4, 2, 1, hairDark);
    px(ctx, ox + 3, oy + 3, 1, 1, hairDark);
    px(ctx, ox + 8, oy + 3, 1, 1, hairDark);
  } else if (machine.animation === 'celebrate') {
    // raised brows
    px(ctx, ox + 3, oy + 3, 2, 1, hairDark);
    px(ctx, ox + 7, oy + 3, 2, 1, hairDark);
  } else {
    // neutral brows
    px(ctx, ox + 3, oy + 4, 2, 1, hairDark);
    px(ctx, ox + 7, oy + 4, 2, 1, hairDark);
  }

  // mouth
  if (machine.animation === 'celebrate') {
    // big smile
    px(ctx, ox + 4, oy + 7, 4, 1, OUTLINE);
    px(ctx, ox + 3, oy + 8, 1, 1, OUTLINE);
    px(ctx, ox + 7, oy + 8, 1, 1, OUTLINE);
  } else if (machine.animation === 'error') {
    // frown
    px(ctx, ox + 4, oy + 8, 4, 1, OUTLINE);
    px(ctx, ox + 3, oy + 7, 1, 1, OUTLINE);
    px(ctx, ox + 7, oy + 7, 1, 1, OUTLINE);
  } else {
    // neutral / slight smile
    px(ctx, ox + 4, oy + 8, 4, 1, OUTLINE);
  }

  // ── Body / torso ───────────────────────────────────────────
  px(ctx, ox + 2, oy + 9,  8,  7, cloth);
  px(ctx, ox + 2, oy + 9,  8,  2, clothHi);   // collar highlight
  px(ctx, ox + 2, oy + 14, 8,  2, clothDark); // waist shadow

  // collar/neck
  px(ctx, ox + 4, oy + 8,  4,  2, SKIN);

  // ── Left arm ───────────────────────────────────────────────
  px(ctx, ox + arms.leftX + 1, oy + arms.leftY, 3, 5, cloth);
  // hand/fist
  px(ctx, ox + arms.leftX + 1, oy + arms.leftY + 4, 3, 2, SKIN_SHD);

  // ── Right arm ──────────────────────────────────────────────
  px(ctx, ox + arms.rightX + 2, oy + arms.rightY, 3, 5, cloth);
  // hand/fist
  px(ctx, ox + arms.rightX + 2, oy + arms.rightY + 4, 3, 2, SKIN_SHD);

  // ── Legs / trousers ────────────────────────────────────────
  const pantsDark = darken(cloth, 0.48);
  const pantsCol  = darken(cloth, 0.38);
  px(ctx, ox + 2 + legs.leftX,  oy + 16 + legs.leftY,  3, 5, pantsCol);
  px(ctx, ox + 7 + legs.rightX, oy + 16 + legs.rightY, 3, 5, pantsCol);
  // inner leg shadow
  px(ctx, ox + 4, oy + 16, 2, 4, pantsDark);

  // ── Shoes ──────────────────────────────────────────────────
  px(ctx, ox + 1 + legs.leftX,  oy + 20, 4, 2, SHOE);
  px(ctx, ox + 6 + legs.rightX, oy + 20, 4, 2, SHOE);
  // sole highlight
  px(ctx, ox + 1 + legs.leftX,  oy + 21, 4, 1, SHOE_SOLE);
  px(ctx, ox + 6 + legs.rightX, oy + 21, 4, 1, SHOE_SOLE);
}
