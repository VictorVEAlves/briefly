'use client';

import { OFFICE_STATUS_META, type OfficeDerivedStatus } from '../agents/agentConfig';

type TooltipProps = {
  open: boolean;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  status: OfficeDerivedStatus;
  progressLabel: string;
};

export function Tooltip({
  open,
  x,
  y,
  title,
  subtitle,
  status,
  progressLabel,
}: TooltipProps) {
  if (!open) return null;

  const meta = OFFICE_STATUS_META[status];

  return (
    <div
      className="pointer-events-none absolute z-40 min-w-[220px] -translate-x-1/2 rounded-[18px] border border-white/10 bg-[rgba(8,8,15,0.94)] px-4 py-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.72)] backdrop-blur-xl"
      style={{
        left: x,
        top: Math.max(86, y - 86),
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Agent
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
        </div>
        <span
          className="mt-1 inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: meta.color, boxShadow: `0 0 14px ${meta.glow}` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          {meta.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300">
          {progressLabel}
        </span>
      </div>
    </div>
  );
}
