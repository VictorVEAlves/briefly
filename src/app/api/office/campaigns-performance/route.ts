export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchCampaignAnalytics, hasAnalyticsConfig } from '@/lib/analytics';
import { campaignToSlug } from '@/lib/utm';

export type CampaignPerformanceItem = {
  id: string;
  nome: string;
  produto_destaque: string;
  periodo_inicio: string;
  periodo_fim: string;
  utm_campaign: string;
  status: string;
  ga4: {
    sessions: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  };
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };
  analyticsError?: string;
};

export async function GET() {
  if (!hasAnalyticsConfig()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  // Fetch campaigns from the last 180 days, not archived
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: campanhas, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, nome, produto_destaque, periodo_inicio, periodo_fim, url_produto, status, archived_at')
    .is('archived_at', null)
    .gte('periodo_inicio', since)
    .order('periodo_inicio', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!campanhas?.length) {
    return NextResponse.json({ items: [] });
  }

  // Fetch GA4 + GSC for each campaign in parallel (cap at 5 concurrent)
  const results = await Promise.all(
    campanhas.map(async (campanha): Promise<CampaignPerformanceItem> => {
      const base: CampaignPerformanceItem = {
        id: campanha.id,
        nome: campanha.nome,
        produto_destaque: campanha.produto_destaque,
        periodo_inicio: campanha.periodo_inicio,
        periodo_fim: campanha.periodo_fim,
        utm_campaign: campaignToSlug(campanha.nome),
        status: campanha.status,
        ga4: { sessions: 0, conversions: 0, revenue: 0, conversionRate: 0 },
        gsc: { clicks: 0, impressions: 0, ctr: 0, averagePosition: 0 },
      };

      try {
        const snapshot = await fetchCampaignAnalytics({
          campaignName: campanha.nome,
          produtoDestaque: campanha.produto_destaque,
          productUrl: campanha.url_produto,
          periodoInicio: campanha.periodo_inicio,
          periodoFim: campanha.periodo_fim,
        });

        return {
          ...base,
          ga4: {
            sessions: snapshot.ga4.sessions,
            conversions: snapshot.ga4.conversions,
            revenue: snapshot.ga4.revenue,
            conversionRate: snapshot.ga4.conversionRate,
          },
          gsc: {
            clicks: snapshot.gsc.clicks,
            impressions: snapshot.gsc.impressions,
            ctr: snapshot.gsc.ctr,
            averagePosition: snapshot.gsc.averagePosition,
          },
        };
      } catch (err) {
        return {
          ...base,
          analyticsError: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      }
    })
  );

  return NextResponse.json({ items: results });
}
