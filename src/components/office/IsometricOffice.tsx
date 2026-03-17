'use client';

import type { Agente } from '@/types/campanha';

interface Props {
  agents: Record<string, Agente>;
  onAgentClick: (id: string) => void;
  onBrieflyClick: () => void;
}

// Fixed desk positions (isometric coords within the SVG viewBox 0 0 900 560)
// Layout: room corner at (450,80) | left wall | right wall | floor from (0,460) to (450,260) to (900,460)
const FIXED_DESKS: Record<
  string,
  { cx: number; cy: number; fallback: { cor: string; emoji: string; nome: string } }
> = {
  briefing: { cx: 450, cy: 290, fallback: { cor: '#6a3a8a', emoji: '📋', nome: 'Briefing' } },
  email:    { cx: 220, cy: 365, fallback: { cor: '#2a5090', emoji: '📧', nome: 'Email' } },
  tasks:    { cx: 680, cy: 365, fallback: { cor: '#1a4a6a', emoji: '✅', nome: 'Tasks' } },
  whatsapp: { cx: 315, cy: 440, fallback: { cor: '#1a6a30', emoji: '💬', nome: 'WhatsApp' } },
  canva:    { cx: 585, cy: 440, fallback: { cor: '#804010', emoji: '🎨', nome: 'Canva' } },
};

// Positions for extra (dynamically hired) agents on the floor edges
const EXTRA_SLOTS = [
  { cx: 120, cy: 445 }, { cx: 780, cy: 445 },
  { cx: 160, cy: 510 }, { cx: 740, cy: 510 },
  { cx: 360, cy: 510 }, { cx: 540, cy: 510 },
];

interface DeskProps {
  cx: number;
  cy: number;
  agentId: string;
  nome: string;
  emoji: string;
  cor: string;
  status: 'idle' | 'working' | 'done' | 'error';
  tarefaAtual: string | null;
  onClick: () => void;
}

function AgentWorkstation({ cx, cy, agentId, nome, emoji, cor, status, tarefaAtual, onClick }: DeskProps) {
  const isWorking = status === 'working';
  const isError = status === 'error';
  const isIdle = !isWorking && !isError;
  const charY = cy + 58;

  // Monitor colors
  const monitorBg = isWorking ? '#0e2060' : isError ? '#400808' : '#12121e';
  const screenFill = isWorking ? '#4a9eff' : isError ? '#cc3333' : '#1a1a2e';
  const screenOpacity = isWorking ? 0.95 : isError ? 0.8 : 0.4;

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Agente ${nome}`}
    >
      {/* ---- Desk ---- */}
      {/* Desk top face (rhombus) */}
      <path
        d={`M ${cx - 44},${cy} L ${cx},${cy - 23} L ${cx + 44},${cy} L ${cx},${cy + 23} Z`}
        fill="#6b3f1a"
        stroke="#3a2010"
        strokeWidth={0.8}
      />
      {/* Dark line on top edge for depth */}
      <path
        d={`M ${cx - 44},${cy} L ${cx},${cy - 23} L ${cx + 44},${cy}`}
        fill="none"
        stroke="#8a5028"
        strokeWidth={1.2}
      />
      {/* Desk front-left face */}
      <path
        d={`M ${cx - 44},${cy} L ${cx},${cy + 23} L ${cx},${cy + 46} L ${cx - 44},${cy + 23} Z`}
        fill="#4a2c10"
      />
      {/* Desk front-right face */}
      <path
        d={`M ${cx},${cy + 23} L ${cx + 44},${cy} L ${cx + 44},${cy + 23} L ${cx},${cy + 46} Z`}
        fill="#3a2008"
      />

      {/* ---- Monitor ---- */}
      {/* Stand */}
      <rect x={cx - 5} y={cy - 32} width={10} height={12} fill="#202028" />
      <path
        d={`M ${cx - 10},${cy - 21} L ${cx + 10},${cy - 21} L ${cx + 14},${cy - 18} L ${cx - 14},${cy - 18} Z`}
        fill="#181820"
      />
      {/* Screen bezel */}
      <rect
        x={cx - 24}
        y={cy - 64}
        width={48}
        height={34}
        rx={3}
        fill={monitorBg}
        stroke="#0a0a18"
        strokeWidth={1}
      />
      {/* Screen surface */}
      <rect
        x={cx - 20}
        y={cy - 61}
        width={40}
        height={27}
        rx={2}
        fill={screenFill}
        opacity={screenOpacity}
        style={
          isWorking
            ? { animation: 'screenPulse 2s ease-in-out infinite' }
            : isError
            ? { animation: 'errorBlink 0.6s ease-in-out infinite' }
            : undefined
        }
      />
      {/* Screen glow overlay when working */}
      {isWorking && (
        <rect
          x={cx - 26}
          y={cy - 67}
          width={52}
          height={40}
          rx={5}
          fill="none"
          stroke={cor}
          strokeWidth={1.5}
          opacity={0.35}
          filter="url(#glowBlue)"
        />
      )}
      {/* Keyboard suggestion */}
      <rect x={cx - 18} y={cy - 8} width={36} height={5} rx={2} fill="#1a1a28" opacity={0.7} />

      {/* ---- Character ---- */}
      <g
        style={{
          transformOrigin: `${cx}px ${charY + 16}px`,
          animation: isIdle ? `walkAnim${agentId.replace(/[^a-z]/g, '')} 3.${agentId.length}s ease-in-out infinite alternate` : 'none',
        }}
      >
        {/* Shadow */}
        <ellipse cx={cx} cy={charY + 36} rx={12} ry={4} fill="rgba(0,0,0,0.35)" />
        {/* Head */}
        <rect x={cx - 7} y={charY} width={14} height={12} rx={3} fill="#e8b88a" />
        {/* Eye dots */}
        <rect x={cx - 4} y={charY + 4} width={2} height={2} fill="#5a3010" />
        <rect x={cx + 2} y={charY + 4} width={2} height={2} fill="#5a3010" />
        {/* Body */}
        <rect x={cx - 6} y={charY + 12} width={12} height={13} fill={cor} />
        {/* Arms */}
        <rect x={cx - 10} y={charY + 14} width={4} height={8} rx={2} fill={cor} opacity={0.8} />
        <rect x={cx + 6} y={charY + 14} width={4} height={8} rx={2} fill={cor} opacity={0.8} />
        {/* Legs */}
        <rect x={cx - 6} y={charY + 25} width={5} height={10} rx={2} fill={cor} opacity={0.85} />
        <rect x={cx + 1} y={charY + 25} width={5} height={10} rx={2} fill={cor} opacity={0.85} />
      </g>

      {/* ---- Speech bubble when working ---- */}
      {isWorking && tarefaAtual && (
        <g>
          <rect
            x={cx - 52}
            y={cy - 100}
            width={104}
            height={26}
            rx={9}
            fill="#e8521a"
            opacity={0.95}
          />
          {/* Arrow */}
          <polygon
            points={`${cx - 5},${cy - 74} ${cx + 5},${cy - 74} ${cx},${cy - 66}`}
            fill="#e8521a"
          />
          <text
            x={cx}
            y={cy - 83}
            textAnchor="middle"
            fontFamily="monospace"
            fontSize={7.5}
            fill="white"
            fontWeight={600}
          >
            {tarefaAtual.length > 22 ? tarefaAtual.slice(0, 22) + '…' : tarefaAtual}
          </text>
        </g>
      )}

      {/* ---- Error indicator ---- */}
      {isError && (
        <text x={cx} y={cy - 78} textAnchor="middle" fontSize={18}>
          ⚠️
        </text>
      )}

      {/* ---- Agent label ---- */}
      <text
        x={cx}
        y={charY + 46}
        textAnchor="middle"
        fontFamily="monospace"
        fontSize={6}
        fill="rgba(255,255,255,0.35)"
        letterSpacing={0.5}
      >
        {emoji} {nome.toUpperCase().slice(0, 10)}
      </text>
    </g>
  );
}

export default function IsometricOffice({ agents, onAgentClick, onBrieflyClick }: Props) {
  // Collect dynamically hired agents (not in FIXED_DESKS)
  const extraAgents = Object.values(agents).filter(
    (a) => a.ativo && !FIXED_DESKS[a.id]
  );

  // Build render list sorted by cy (back-to-front for correct z-order)
  const fixedList = Object.entries(FIXED_DESKS).map(([id, cfg]) => {
    const agent = agents[id];
    return {
      id,
      cx: cfg.cx,
      cy: cfg.cy,
      nome: agent?.nome ?? cfg.fallback.nome,
      emoji: agent?.emoji ?? cfg.fallback.emoji,
      cor: agent?.cor ?? cfg.fallback.cor,
      status: (agent?.status ?? 'idle') as 'idle' | 'working' | 'done' | 'error',
      tarefaAtual: agent?.tarefa_atual ?? null,
    };
  });

  const extraList = extraAgents.slice(0, EXTRA_SLOTS.length).map((a, i) => ({
    id: a.id,
    cx: EXTRA_SLOTS[i].cx,
    cy: EXTRA_SLOTS[i].cy,
    nome: a.nome,
    emoji: a.emoji,
    cor: a.cor,
    status: a.status,
    tarefaAtual: a.tarefa_atual,
  }));

  const allDesks = [...fixedList, ...extraList].sort((a, b) => a.cy - b.cy);

  return (
    <svg
      viewBox="0 0 900 560"
      style={{ width: '100%', height: '100%', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow filter for active monitors */}
        <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient room light gradient */}
        <radialGradient id="roomLight" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#3a2a18" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#0a0806" stopOpacity={0} />
        </radialGradient>

        {/* Floor clip */}
        <clipPath id="floorClip">
          <path d="M 0,460 L 450,260 L 900,460 L 900,560 L 0,560 Z" />
        </clipPath>

        {/* Walk animations per agent (slight random offset to desync) */}
        <style>{`
          @keyframes walkanim-briefing  { 0%{transform:translateX(-14px)} 100%{transform:translateX(14px)} }
          @keyframes walkanim-email     { 0%{transform:translateX(-12px)} 100%{transform:translateX(12px)} }
          @keyframes walkanim-tasks     { 0%{transform:translateX(-12px)} 100%{transform:translateX(12px)} }
          @keyframes walkanim-whatsapp  { 0%{transform:translateX(-10px)} 100%{transform:translateX(10px)} }
          @keyframes walkanim-canva     { 0%{transform:translateX(-10px)} 100%{transform:translateX(10px)} }

          @keyframes screenPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
          @keyframes errorBlink  { 0%,100%{opacity:0.9} 50%{opacity:0.15} }
          @keyframes pulse       { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }

          .desk-group:hover { filter: brightness(1.12); }
        `}</style>
      </defs>

      {/* ============ BACKGROUND ============ */}
      <rect width={900} height={560} fill="#0d0b08" />

      {/* Room ambient glow */}
      <rect width={900} height={560} fill="url(#roomLight)" />

      {/* ============ WALLS ============ */}
      {/* Left wall */}
      <path
        d="M 0,280 L 450,80 L 450,260 L 0,460 Z"
        fill="#1c1710"
        stroke="#0d0b08"
        strokeWidth={0.5}
      />
      {/* Left wall top highlight */}
      <path
        d="M 0,280 L 450,80"
        fill="none"
        stroke="#2e2318"
        strokeWidth={1.5}
      />
      {/* Left wall lower edge */}
      <path
        d="M 0,460 L 450,260"
        fill="none"
        stroke="#151008"
        strokeWidth={1}
      />

      {/* Right wall */}
      <path
        d="M 450,80 L 900,280 L 900,460 L 450,260 Z"
        fill="#17140d"
        stroke="#0d0b08"
        strokeWidth={0.5}
      />
      {/* Right wall top highlight */}
      <path
        d="M 450,80 L 900,280"
        fill="none"
        stroke="#28200f"
        strokeWidth={1.5}
      />
      {/* Right wall lower edge */}
      <path
        d="M 450,260 L 900,460"
        fill="none"
        stroke="#100e07"
        strokeWidth={1}
      />

      {/* Back corner vertical line */}
      <line x1={450} y1={80} x2={450} y2={260} stroke="#252018" strokeWidth={1.5} />

      {/* ============ FLOOR ============ */}
      <path
        d="M 0,460 L 450,260 L 900,460 L 900,560 L 0,560 Z"
        fill="#110e08"
      />

      {/* Floor grid lines */}
      <g clipPath="url(#floorClip)" opacity={0.35}>
        {/* Lines going toward back-right (parallel to right boundary) */}
        {[-360, -270, -180, -90, 0, 90, 180, 270, 360, 450, 540, 630, 720].map((offset) => (
          <line
            key={`gr${offset}`}
            x1={offset}
            y1={460}
            x2={offset + 450}
            y2={260}
            stroke="#2a2010"
            strokeWidth={0.8}
          />
        ))}
        {/* Lines going toward back-left (parallel to left boundary) */}
        {[180, 270, 360, 450, 540, 630, 720, 810, 900, 990, 1080, 1170, 1260].map((offset) => (
          <line
            key={`gl${offset}`}
            x1={offset}
            y1={460}
            x2={offset - 450}
            y2={260}
            stroke="#2a2010"
            strokeWidth={0.8}
          />
        ))}
      </g>

      {/* Floor edge highlight */}
      <path
        d="M 0,460 L 450,260 L 900,460"
        fill="none"
        stroke="#1e1810"
        strokeWidth={1.2}
      />

      {/* ============ DECORATIONS ============ */}
      {/* "BRIEFLY" text on back wall */}
      <g
        onClick={onBrieflyClick}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label="Briefly manager"
      >
        <rect x={390} y={100} width={120} height={44} rx={8} fill="rgba(224,38,31,0.12)" stroke="rgba(224,38,31,0.3)" strokeWidth={1} />
        <text
          x={450}
          y={118}
          textAnchor="middle"
          fontFamily="'Press Start 2P', monospace"
          fontSize={8}
          fill="rgba(255,255,255,0.5)"
          letterSpacing={2}
        >
          ✦ BRIEFLY
        </text>
        <text
          x={450}
          y={133}
          textAnchor="middle"
          fontFamily="monospace"
          fontSize={7}
          fill="rgba(255,255,255,0.25)"
        >
          marketing automation
        </text>
      </g>

      {/* ============ AGENT WORKSTATIONS (sorted back-to-front) ============ */}
      {allDesks.map((desk) => {
        const isBriefing = desk.id === 'briefing';
        return (
          <g
            key={desk.id}
            className="desk-group"
            style={{ transition: 'filter 0.15s' }}
          >
            <AgentWorkstation
              cx={desk.cx}
              cy={desk.cy}
              agentId={desk.id}
              nome={desk.nome}
              emoji={desk.emoji}
              cor={desk.cor}
              status={desk.status}
              tarefaAtual={desk.tarefaAtual}
              onClick={isBriefing ? onBrieflyClick : () => onAgentClick(desk.id)}
            />
          </g>
        );
      })}

      {/* ============ FLOOR REFLECTIONS (subtle) ============ */}
      <rect
        x={0}
        y={480}
        width={900}
        height={80}
        fill="url(#roomLight)"
        opacity={0.3}
      />
    </svg>
  );
}
