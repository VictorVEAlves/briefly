'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SiteAnalyticsSnapshot, SiteChannelRow } from '@/lib/analytics';

export function CampaignAnalytics() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Site analytics
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
          Performance do site
        </h2>
      </div>
      <SiteMetrics />
    </section>
  );
}

type Period = 7 | 30 | 90;

function SiteMetrics() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<SiteAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  const load = useCallback(async (days: Period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/office/site-analytics?period=${days}`);
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setError(`HTTP ${res.status} — resposta inválida do servidor`);
        return;
      }
      if (!res.ok) {
        const errObj = json as { error?: string };
        setError(res.status === 503 ? 'not_configured' : (errObj.error ?? `Erro ${res.status}`));
        return;
      }
      setData(json as SiteAnalyticsSnapshot);
    } catch (e) {
      setError(`Falha na requisição: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
    const interval = setInterval(() => void load(period), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load, period]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    setShowAllKeywords(false);
  };

  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const fmtMoney = (n: number) =>
    n >= 1_000_000
      ? `R$ ${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `R$ ${(n / 1_000).toFixed(1)}k`
        : `R$ ${n.toFixed(0)}`;

  const delta = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const maxPageSessions = data ? Math.max(...data.ga4.topPages.map((p) => p.sessions), 1) : 1;
  const maxKwClicks = data ? Math.max(...data.gsc.keywords.map((k) => k.clicks), 1) : 1;
  const visibleKeywords = showAllKeywords
    ? data?.gsc.keywords.slice(0, 10)
    : data?.gsc.keywords.slice(0, 5);

  return (
    <div className="mt-5">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-slate-500">
          {data ? `${data.period.startDate} → ${data.period.endDate}` : 'carregando...'}
        </p>
        <div className="flex items-center gap-1.5">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] transition ${
                period === p
                  ? 'bg-white/10 text-white'
                  : 'border border-white/8 bg-white/3 text-slate-500 hover:text-slate-300'
              }`}
            >
              {p}D
            </button>
          ))}
          {!loading && !error && (
            <button
              onClick={() => void load(period)}
              className="rounded-full border border-white/8 bg-white/3 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-18 rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-32 rounded-xl bg-white/5" />
            <div className="h-32 rounded-xl bg-white/5" />
          </div>
        </div>
      )}

      {/* Not configured */}
      {!loading && error === 'not_configured' && (
        <p className="mt-4 text-sm text-slate-500">Google Analytics não configurado.</p>
      )}

      {/* Error */}
      {!loading && error && error !== 'not_configured' && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => void load(period)}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && (
        <div className="mt-4 space-y-5">
          {/* ── SEO (Google Search Console) ── */}
          <div className="rounded-[20px] border border-white/6 bg-[rgba(8,8,15,0.5)] p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-indigo-400/80">
              SEO · Google Search Console
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Impressões"
                value={fmtNum(data.gsc.impressions)}
                delta={delta(data.gsc.impressions, data.gsc.prev.impressions)}
                color="#6366f1"
              />
              <MetricCard
                label="Cliques"
                value={fmtNum(data.gsc.clicks)}
                delta={delta(data.gsc.clicks, data.gsc.prev.clicks)}
                color="#3b82f6"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label={`CTR ${fmtPct(data.gsc.ctr)}`} />
              <Pill label={`Pos. média ${data.gsc.averagePosition.toFixed(1)}`} />
            </div>
            {data.gsc.keywords.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Top palavras-chave
                </p>
                <div className="space-y-2">
                  {visibleKeywords?.map((kw) => (
                    <div key={kw.keyword}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate text-xs text-slate-300">{kw.keyword}</span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {kw.clicks} cliques
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-500">
                          pos {kw.averagePosition.toFixed(0)}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full bg-indigo-500/60"
                          style={{ width: `${Math.max(4, (kw.clicks / maxKwClicks) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {data.gsc.keywords.length > 5 && (
                  <button
                    onClick={() => setShowAllKeywords((v) => !v)}
                    className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300"
                  >
                    {showAllKeywords ? '↑ ver menos' : `↓ ver mais (${data.gsc.keywords.length})`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Tráfego (Google Analytics 4) ── */}
          <div className="rounded-[20px] border border-white/6 bg-[rgba(8,8,15,0.5)] p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400/80">
              Tráfego · Google Analytics 4
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Sessões"
                value={fmtNum(data.ga4.sessions)}
                delta={delta(data.ga4.sessions, data.ga4.prev.sessions)}
                color="#22c55e"
              />
              <MetricCard
                label="Usuários ativos"
                value={fmtNum(data.ga4.activeUsers)}
                delta={delta(data.ga4.activeUsers, data.ga4.prev.activeUsers)}
                color="#34d399"
              />
              <MetricCard
                label="Conversões"
                value={fmtNum(data.ga4.conversions)}
                delta={delta(data.ga4.conversions, data.ga4.prev.conversions)}
                color="#f59e0b"
              />
              <MetricCard
                label="Taxa de conversão"
                value={fmtPct(data.ga4.conversionRate)}
                delta={null}
                color="#f59e0b"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.ga4.revenue > 0 && (
                <Pill
                  label={`Receita R$ ${data.ga4.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                />
              )}
              {data.ga4.avgOrderValue > 0 && (
                <Pill
                  label={`Ticket médio R$ ${data.ga4.avgOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                />
              )}
            </div>
            {data.ga4.topChannels.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Canais de aquisição
                </p>
                <ChannelsBreakdown channels={data.ga4.topChannels} fmtNum={fmtNum} fmtMoney={fmtMoney} />
              </div>
            )}
            {data.ga4.topPages.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Top páginas
                </p>
                <div className="space-y-2">
                  {data.ga4.topPages.map((pg) => (
                    <div key={pg.page}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate text-xs text-slate-300" title={pg.page}>
                          {pg.page}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {fmtNum(pg.sessions)} sess.
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${Math.max(4, (pg.sessions / maxPageSessions) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  'Organic Search': 'Busca orgânica',
  'Direct': 'Direto',
  'Email': 'Email',
  'Organic Social': 'Social orgânico',
  'Paid Search': 'Busca paga',
  'Referral': 'Referência',
  'Unassigned': 'Não atribuído',
  'Cross-network': 'Cross-network',
  'Paid Social': 'Social pago',
  'Organic Video': 'Vídeo orgânico',
  'Paid Video': 'Vídeo pago',
};

const CHANNEL_COLORS: Record<string, string> = {
  'Organic Search': '#6366f1',
  'Direct': '#94a3b8',
  'Email': '#f59e0b',
  'Organic Social': '#ec4899',
  'Paid Search': '#3b82f6',
  'Referral': '#14b8a6',
  'Cross-network': '#8b5cf6',
  'Paid Social': '#f43f5e',
};

function ChannelsBreakdown({
  channels,
  fmtNum,
  fmtMoney,
}: {
  channels: SiteChannelRow[];
  fmtNum: (n: number) => string;
  fmtMoney: (n: number) => string;
}) {
  const maxSessions = Math.max(...channels.map((c) => c.sessions), 1);
  return (
    <div className="space-y-2">
      {channels.map((ch) => {
        const label = CHANNEL_LABELS[ch.channel] ?? ch.channel;
        const color = CHANNEL_COLORS[ch.channel] ?? '#64748b';
        return (
          <div key={ch.channel}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 truncate text-xs text-slate-300">{label}</span>
              <span className="shrink-0 font-mono text-[10px] text-slate-400">
                {fmtNum(ch.sessions)} sess.
              </span>
              {ch.revenue > 0 && (
                <span className="shrink-0 font-mono text-[10px] text-emerald-400">
                  {fmtMoney(ch.revenue)}
                </span>
              )}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(4, (ch.sessions / maxSessions) * 100)}%`,
                  backgroundColor: `${color}99`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: string;
  delta: number | null;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/3 p-3 text-center">
      <p className="font-mono text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
      {delta !== null && (
        <p
          className={`mt-1 font-mono text-[10px] font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          style={delta === 0 ? { color } : undefined}
        >
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] text-slate-400">
      {label}
    </span>
  );
}
