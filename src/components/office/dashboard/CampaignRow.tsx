'use client';

import Link from 'next/link';
import { cn } from '@/components/ui/chrome';
import type { DashboardCampaignItem } from '../hooks/useDashboardData';

type CampaignRowProps = {
  item: DashboardCampaignItem;
};

const STATUS_META: Record<
  DashboardCampaignItem['derivedStatus'],
  { label: string; className: string; dot: string }
> = {
  pronta: {
    label: 'Pronta',
    className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    dot: 'bg-emerald-400',
  },
  ativa: {
    label: 'Ativa',
    className: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    dot: 'bg-amber-400',
  },
  erro: {
    label: 'Erro',
    className: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    dot: 'bg-rose-400',
  },
  rascunho: {
    label: 'Rascunho',
    className: 'border-white/10 bg-white/5 text-slate-300',
    dot: 'bg-slate-400',
  },
  aprovada: {
    label: 'Confirmada',
    className: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    dot: 'bg-sky-400',
  },
};

export function CampaignRow({ item }: CampaignRowProps) {
  const meta = STATUS_META[item.derivedStatus];

  return (
    <div className="grid gap-3 rounded-[22px] border border-white/8 bg-[rgba(8,8,15,0.5)] px-4 py-4 transition hover:border-white/15 hover:bg-[rgba(18,18,31,0.74)] md:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
          <p className="truncate text-sm font-semibold text-white">{item.campanha.nome}</p>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {item.outputCount} outputs gerados
          {item.pendingApprovals > 0 ? ` • ${item.pendingApprovals} aprovacoes pendentes` : ''}
        </p>
      </div>

      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
          meta.className
        )}
      >
        {meta.label}
      </span>

      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {formatRelative(item.latestActivityAt)}
      </span>

      <Link
        href={`/aprovacao/${item.campanha.id}`}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-violet-400/35 bg-violet-500/18 px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-violet-500/28"
      >
        Abrir
      </Link>
    </div>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes}m atras`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atras`;
  return diffHours < 48 ? 'ontem' : `${Math.floor(diffHours / 24)}d atras`;
}
