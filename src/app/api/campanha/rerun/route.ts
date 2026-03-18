import { NextResponse } from 'next/server';
import { callAgent, logAgente } from '@/lib/agente-utils';
import { hasAnalyticsConfig, resolveAnalyticsDateRange } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabase';
import type { CampanhaOutput, OutputTipo } from '@/types/campanha';

function getLatestOutputs(outputs: CampanhaOutput[]) {
  const latestByType = new Map<OutputTipo, CampanhaOutput>();

  for (const output of outputs) {
    const type = output.tipo as OutputTipo;
    const current = latestByType.get(type);
    if (!current || new Date(output.created_at).getTime() > new Date(current.created_at).getTime()) {
      latestByType.set(type, output);
    }
  }

  return latestByType;
}

function needsOutput(latestByType: Map<OutputTipo, CampanhaOutput>, type: OutputTipo) {
  const latest = latestByType.get(type);
  return !latest || latest.status === 'erro';
}

function canRunAnalyticsNow(periodoInicio: string, periodoFim: string) {
  try {
    return resolveAnalyticsDateRange(periodoInicio, periodoFim).hasStarted;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let campanhaId: string;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;

  const [{ data: campanha, error: campanhaError }, { data: outputs, error: outputsError }] =
    await Promise.all([
      supabaseAdmin.from('campanhas').select('*').eq('id', campanhaId).single(),
      supabaseAdmin
        .from('campanha_outputs')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('created_at', { ascending: false }),
    ]);

  if (campanhaError || !campanha) {
    return NextResponse.json({ error: 'Campanha nao encontrada' }, { status: 404 });
  }

  if (campanha.archived_at) {
    return NextResponse.json(
      { error: 'Campanha arquivada nao pode ser reprocessada' },
      { status: 400 }
    );
  }

  if (outputsError) {
    return NextResponse.json({ error: outputsError.message }, { status: 500 });
  }

  await logAgente(campanhaId, 'orchestrator', 'iniciado', 'Rerun manual disparado pelo dashboard');

  if (campanha.status === 'erro') {
    await supabaseAdmin
      .from('campanhas')
      .update({ status: campanha.clickup_list_id ? 'em_revisao' : 'gerando' })
      .eq('id', campanhaId);
  }

  const triggered: string[] = [];

  if (!campanha.clickup_list_id) {
    const briefingResponse = await callAgent('/api/agentes/briefing', { campanhaId }, { baseUrl });
    if (!briefingResponse.ok) {
      const text = await briefingResponse.text().catch(() => 'erro desconhecido');
      return NextResponse.json(
        { error: `Falha ao rerodar briefing: ${text}` },
        { status: 500 }
      );
    }
    triggered.push('briefing');

    const tasksResponse = await callAgent('/api/agentes/tasks', { campanhaId }, { baseUrl });
    if (!tasksResponse.ok) {
      const text = await tasksResponse.text().catch(() => 'erro desconhecido');
      return NextResponse.json(
        { error: `Falha ao rerodar tasks: ${text}` },
        { status: 500 }
      );
    }
    triggered.push('tasks');

    return NextResponse.json({ ok: true, triggered });
  }

  const latestByType = getLatestOutputs((outputs ?? []) as CampanhaOutput[]);
  const canais = Array.isArray(campanha.canais) ? campanha.canais : [];
  const jobs: Array<Promise<{ label: string; ok: boolean; error?: string }>> = [];

  const runAgent = async (
    label: string,
    path: string,
    body: Record<string, unknown>
  ) => {
    const response = await callAgent(path, body, { baseUrl });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'erro desconhecido');
      return { label, ok: false, error: errorText };
    }

    triggered.push(label);
    return { label, ok: true };
  };

  if (canais.includes('email') && needsOutput(latestByType, 'email')) {
    jobs.push(runAgent('email', '/api/agentes/email', { campanhaId }));
  }

  if (canais.includes('whatsapp') && needsOutput(latestByType, 'whatsapp')) {
    jobs.push(runAgent('whatsapp', '/api/agentes/whatsapp', { campanhaId }));
  }

  const artTargets: OutputTipo[] = [];
  if (canais.includes('instagram_feed') && needsOutput(latestByType, 'arte_feed')) {
    artTargets.push('arte_feed');
  }
  if (canais.includes('instagram_stories') && needsOutput(latestByType, 'arte_story')) {
    artTargets.push('arte_story');
  }
  if (artTargets.length > 0) {
    jobs.push(
      runAgent('artes', '/api/agentes/artes', {
        campanhaId,
        targets: artTargets,
      })
    );
  }

  if (
    hasAnalyticsConfig() &&
    canRunAnalyticsNow(campanha.periodo_inicio, campanha.periodo_fim) &&
    needsOutput(latestByType, 'relatorio')
  ) {
    jobs.push(runAgent('analytics', '/api/agentes/analytics', { campanhaId }));
  }

  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, triggered });
  }

  const results = await Promise.all(jobs);
  const failures = results.filter((result) => !result.ok);

  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: failures.map((failure) => `${failure.label}: ${failure.error}`).join(' | '),
        triggered,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, triggered });
}
