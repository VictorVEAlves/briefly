/**
 * Auto-report cron
 * Runs every Monday at 8am (vercel.json)
 * Finds campaigns that ended in the past 7 days and have no analytics report yet.
 * Dispatches the analytics agent for each one.
 */
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hasAnalyticsConfig } from '@/lib/analytics';
import { env } from '@/lib/env';

function isAuthorized(req: Request) {
  const auth = req.headers.get('authorization');
  return [env.INTERNAL_API_SECRET, process.env.CRON_SECRET]
    .filter(Boolean)
    .some((secret) => auth === `Bearer ${secret}`);
}

async function runAutoReports() {
  if (!hasAnalyticsConfig()) {
    return { skipped: 0, triggered: 0, reason: 'analytics_not_configured' };
  }

  const today = new Date().toISOString().slice(0, 10);
  // Campaigns that ended between 1 and 8 days ago
  const windowStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const windowEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Campaigns that ended in the window and are not archived
  const { data: candidatas, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, nome, periodo_fim')
    .is('archived_at', null)
    .gte('periodo_fim', windowStart)
    .lte('periodo_fim', windowEnd)
    .order('periodo_fim', { ascending: false });

  if (error) throw new Error(`Erro ao buscar campanhas: ${error.message}`);
  if (!candidatas?.length) return { skipped: 0, triggered: 0 };

  const campanhaIds = candidatas.map((c) => c.id);

  // Find which ones already have a completed/approved analytics report
  const { data: existingReports } = await supabaseAdmin
    .from('campanha_outputs')
    .select('campanha_id')
    .in('campanha_id', campanhaIds)
    .eq('tipo', 'relatorio')
    .in('status', ['pronto', 'aprovado']);

  const jaTemRelatorio = new Set((existingReports ?? []).map((r) => r.campanha_id));

  const semRelatorio = candidatas.filter((c) => !jaTemRelatorio.has(c.id));

  if (!semRelatorio.length) {
    return { skipped: candidatas.length, triggered: 0 };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const triggered: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const campanha of semRelatorio) {
    try {
      const res = await fetch(`${appUrl}/api/agentes/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.INTERNAL_API_SECRET}`,
        },
        body: JSON.stringify({ campanhaId: campanha.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        errors.push({ id: campanha.id, error: (body as { error?: string }).error ?? `HTTP ${res.status}` });
      } else {
        triggered.push(campanha.nome);
      }
    } catch (e) {
      errors.push({ id: campanha.id, error: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }

  console.log(
    `[auto-reports] ${today} — ${triggered.length} relatorios disparados, ${errors.length} erros, ${jaTemRelatorio.size} ja existiam`
  );

  return {
    triggered: triggered.length,
    skipped: jaTemRelatorio.size,
    errors,
    campanhas: triggered,
  };
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const result = await runAutoReports();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[auto-reports] erro:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
