'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CampaignPerformanceItem } from '@/app/api/office/campaigns-performance/route';

const STATUS_COLORS: Record<string, string> = {
  aprovada: '#22c55e',
  em_revisao: '#eab308',
  gerando: '#6366f1',
  rascunho: '#64748b',
  erro: '#ef4444',
};

function fmtNum(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : String(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtBrl(n: number) {
  if (n === 0) return '—';
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CampaignPerformance() {
  const [items, setItems] = useState<CampaignPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/office/campaigns-performance');
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setError(`HTTP ${res.status} — resposta inválida`);
        return;
      }
      if (!res.ok) {
        const err = json as { error?: string };
        setError(res.status === 503 ? 'not_configured' : (err.error ?? `Erro ${res.status}`));
        return;
      }
      setItems((json as { items: CampaignPerformanceItem[] }).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na requisição');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Attribution
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Performance por campanha
          </h2>
        </div>
        {!loading && !error && (
          <button
            onClick={() => void load()}
            className="rounded-full border border-white/8 bg-white/3 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300"
          >
            ↻ atualizar
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-5 animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {!loading && error === 'not_configured' && (
        <p className="mt-4 text-sm text-slate-500">Google Analytics não configurado.</p>
      )}

      {!loading && error && error !== 'not_configured' && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => void load()}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">Nenhuma campanha nos últimos 180 dias.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/6">
                <th className="pb-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Campanha
                </th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Sessões
                </th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Conversões
                </th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Receita
                </th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Cliques GSC
                </th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {items.map((item) => (
                <tr key={item.id} className="group transition hover:bg-white/2">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.status] ?? '#64748b' }}
                      />
                      <div>
                        <p className="font-medium text-white">{item.nome}</p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {item.periodo_inicio} → {item.periodo_fim}
                        </p>
                      </div>
                    </div>
                    {item.analyticsError && (
                      <p className="mt-0.5 font-mono text-[9px] text-amber-500/70 pl-3.5">
                        sem match GA4
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-slate-300">
                    {item.ga4.sessions > 0 ? fmtNum(item.ga4.sessions) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-slate-300">
                    {item.ga4.conversions > 0 ? (
                      <span className="text-emerald-400">{fmtNum(item.ga4.conversions)}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-slate-300">
                    {item.ga4.revenue > 0 ? (
                      <span className="text-emerald-400">{fmtBrl(item.ga4.revenue)}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-slate-300">
                    {item.gsc.clicks > 0 ? fmtNum(item.gsc.clicks) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-slate-300">
                    {item.gsc.ctr > 0 ? fmtPct(item.gsc.ctr) : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* UTM legend */}
          <p className="mt-3 font-mono text-[9px] text-slate-600">
            Dados GA4 por <span className="text-slate-500">sessionCampaignName</span> ·
            Ative UTMs nos links para atribuição precisa ·
            GSC = tráfego orgânico do período da campanha
          </p>
        </div>
      )}
    </section>
  );
}
