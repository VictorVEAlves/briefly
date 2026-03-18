'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardAnalytics } from '../hooks/useDashboardData';
import type { SiteAnalyticsSnapshot } from '@/lib/analytics';

type CampaignAnalyticsProps = {
  analytics: DashboardAnalytics;
  loading: boolean;
};

export function CampaignAnalytics({ analytics, loading }: CampaignAnalyticsProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Campaign analytics
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
          Analise de campanhas
        </h2>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel
          title="Campanhas por status"
          items={[
            { label: 'Prontas', value: analytics.campaignsByStatus.pronta, color: '#22c55e' },
            { label: 'Ativas', value: analytics.campaignsByStatus.ativa, color: '#eab308' },
            { label: 'Erros', value: analytics.campaignsByStatus.erro, color: '#ef4444' },
            { label: 'Rascunho', value: analytics.campaignsByStatus.rascunho, color: '#64748b' },
            { label: 'Confirmadas', value: analytics.campaignsByStatus.aprovada, color: '#3b82f6' },
          ]}
          loading={loading}
        />
        <AnalyticsPanel
          title="Outputs por tipo"
          items={[
            { label: 'Briefings', value: analytics.outputsByType.briefing, color: '#a855f7' },
            { label: 'Emails', value: analytics.outputsByType.email, color: '#3b82f6' },
            { label: 'WhatsApp', value: analytics.outputsByType.whatsapp, color: '#22c55e' },
            { label: 'Arte Feed', value: analytics.outputsByType.arte_feed, color: '#f97316' },
            { label: 'Arte Story', value: analytics.outputsByType.arte_story, color: '#fb923c' },
            { label: 'Relatorios', value: analytics.outputsByType.relatorio, color: '#14b8a6' },
          ]}
          loading={loading}
        />
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

  const delta = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const funnel = data
    ? [
        {
          label: 'Impressões',
          value: data.gsc.impressions,
          prev: data.gsc.prev.impressions,
          color: '#6366f1',
          sub: `CTR ${fmtPct(data.gsc.ctr)}`,
        },
        {
          label: 'Cliques',
          value: data.gsc.clicks,
          prev: data.gsc.prev.clicks,
          color: '#3b82f6',
          sub: null,
        },
        {
          label: 'Sessões',
          value: data.ga4.sessions,
          prev: data.ga4.prev.sessions,
          color: '#22c55e',
          sub: null,
        },
        {
          label: 'Conversões',
          value: data.ga4.conversions,
          prev: data.ga4.prev.conversions,
          color: '#f59e0b',
          sub: null,
        },
      ]
    : [];

  const maxPageSessions = data ? Math.max(...data.ga4.topPages.map((p) => p.sessions), 1) : 1;
  const maxKwClicks = data ? Math.max(...data.gsc.keywords.map((k) => k.clicks), 1) : 1;
  const visibleKeywords = showAllKeywords ? data?.gsc.keywords.slice(0, 10) : data?.gsc.keywords.slice(0, 5);

  return (
    <div className="mt-5 rounded-[24px] border border-white/8 bg-[rgba(8,8,15,0.5)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Performance do site</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {data ? `${data.period.startDate} → ${data.period.endDate}` : 'carregando...'}
          </p>
        </div>
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

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-36 rounded-xl bg-white/5" />
            <div className="h-36 rounded-xl bg-white/5" />
          </div>
        </div>
      )}

      {/* Not configured */}
      {!loading && error === 'not_configured' && (
        <p className="mt-3 text-sm text-slate-500">Google Analytics não configurado.</p>
      )}

      {/* Error */}
      {!loading && error && error !== 'not_configured' && (
        <div className="mt-3 flex items-center gap-3">
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
        <div className="mt-4 space-y-4">
          {/* Funnel cards */}
          <div className="grid grid-cols-4 gap-1.5">
            {funnel.map((step, i) => {
              const d = delta(step.value, step.prev);
              return (
                <div key={step.label} className="relative">
                  <div className="rounded-xl border border-white/6 bg-white/3 p-3 text-center">
                    <p className="font-mono text-lg font-bold text-white">{fmtNum(step.value)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{step.label}</p>
                    {step.sub && (
                      <p className="mt-1 font-mono text-[10px]" style={{ color: step.color }}>
                        {step.sub}
                      </p>
                    )}
                    {d !== null && (
                      <p
                        className={`mt-1 font-mono text-[10px] font-semibold ${d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {d >= 0 ? '↑' : '↓'} {Math.abs(d).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  {i < funnel.length - 1 && (
                    <span className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 text-slate-600 text-xs">
                      ›
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] text-slate-400">
              CTR {fmtPct(data.gsc.ctr)}
            </span>
            <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] text-slate-400">
              Pos. média {data.gsc.averagePosition.toFixed(1)}
            </span>
            {data.ga4.revenue > 0 && (
              <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                Receita R${' '}
                {data.ga4.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            )}
          </div>

          {/* Keywords + Top pages grid */}
          <div className="grid gap-3 xl:grid-cols-2">
            {/* Top keywords */}
            {data.gsc.keywords.length > 0 && (
              <div className="rounded-xl border border-white/6 bg-white/2 p-3">
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
                    className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition"
                  >
                    {showAllKeywords ? '↑ ver menos' : `↓ ver mais (${data.gsc.keywords.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Top pages */}
            {data.ga4.topPages.length > 0 && (
              <div className="rounded-xl border border-white/6 bg-white/2 p-3">
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

function AnalyticsPanel({
  title,
  items,
  loading,
}: {
  title: string;
  items: Array<{ label: string; value: number; color: string }>;
  loading: boolean;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-[24px] border border-white/8 bg-[rgba(8,8,15,0.5)] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{item.label}</p>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {loading ? '--' : item.value}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${loading ? 24 : Math.max(8, (item.value / maxValue) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
