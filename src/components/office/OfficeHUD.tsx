'use client';

import Link from 'next/link';
import type { Agente } from '@/types/campanha';

interface Props {
  agents: Record<string, Agente>;
  workingCount: number;
  onBrieflyClick: () => void;
  onHireClick: () => void;
}

export default function OfficeHUD({ agents, workingCount, onBrieflyClick, onHireClick }: Props) {
  const agentList = Object.values(agents).filter((a) => a.ativo);
  const errorCount = agentList.filter((a) => a.status === 'error').length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 52,
        background: 'rgba(10,8,6,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Brand */}
      <button
        onClick={onBrieflyClick}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 8px',
          borderRadius: 8,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg,#e0261f,#a01010)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          B
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.1em',
          }}
        >
          BRIEFLY
        </span>
      </button>

      {/* Status pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill
          label={`${agentList.length} agentes`}
          color="rgba(255,255,255,0.12)"
          textColor="rgba(255,255,255,0.6)"
        />
        {workingCount > 0 && (
          <Pill
            label={`${workingCount} trabalhando`}
            color="rgba(232,82,26,0.25)"
            textColor="#f0a060"
            dot="rgba(232,82,26,0.9)"
          />
        )}
        {errorCount > 0 && (
          <Pill
            label={`${errorCount} erro`}
            color="rgba(180,30,30,0.25)"
            textColor="#f06060"
            dot="rgba(200,50,50,0.9)"
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/briefing"
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          + Campanha
        </Link>
        <button
          onClick={onHireClick}
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 6,
          }}
        >
          + Agente
        </button>
      </div>
    </div>
  );
}

function Pill({
  label,
  color,
  textColor,
  dot,
}: {
  label: string;
  color: string;
  textColor: string;
  dot?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: color,
        borderRadius: 20,
        padding: '3px 10px',
        fontFamily: 'monospace',
        fontSize: 10,
        color: textColor,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: dot,
            animation: 'pulse 1.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </div>
  );
}
