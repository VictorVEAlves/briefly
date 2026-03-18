import { NextResponse } from 'next/server';
import { getCanvaAccessToken } from '@/lib/canva/getCanvaAccessToken';
import { ClickUpApiError, getList } from '@/lib/clickup';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const [supabaseStatus, clickupStatus, canvaStatus] = await Promise.all([
    checkSupabase(),
    checkClickUp(),
    checkCanva(),
  ]);

  const host = new URL(req.url).host;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  return NextResponse.json({
    integrations: [
      supabaseStatus,
      clickupStatus,
      {
        key: 'claude',
        label: 'Claude API',
        connected: Boolean(process.env.ANTHROPIC_API_KEY),
        summary: process.env.ANTHROPIC_API_KEY ? 'Conectado' : 'Nao configurado',
        detail: `Modelo atual: ${model}`,
      },
      canvaStatus,
      {
        key: 'vercel',
        label: 'Vercel',
        connected: true,
        summary: 'Deploy online',
        detail: host,
      },
    ],
  });
}

async function checkSupabase() {
  const startedAt = Date.now();
  const { error } = await supabaseAdmin.from('campanhas').select('id').limit(1);
  const latencyMs = Date.now() - startedAt;

  if (error) {
    return {
      key: 'supabase',
      label: 'Supabase',
      connected: false,
      summary: 'Falha de conexao',
      detail: error.message,
      latencyMs,
    };
  }

  return {
    key: 'supabase',
    label: 'Supabase',
    connected: true,
    summary: 'Conectado',
    detail: 'Banco operacional',
    latencyMs,
  };
}

async function checkClickUp() {
  const configured = Boolean(
    process.env.CLICKUP_API_KEY &&
      process.env.CLICKUP_WORKSPACE_ID &&
      process.env.CLICKUP_CAMPANHAS_FOLDER_ID
  );

  if (!configured) {
    return {
      key: 'clickup',
      label: 'ClickUp',
      connected: false,
      summary: 'Nao configurado',
      detail: 'Variaveis de ambiente ausentes',
    };
  }

  const { data: campaign } = await supabaseAdmin
    .from('campanhas')
    .select('clickup_list_id')
    .not('clickup_list_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!campaign?.clickup_list_id) {
    return {
      key: 'clickup',
      label: 'ClickUp',
      connected: true,
      summary: 'Configurado',
      detail: 'Aguardando uma lista para validar',
    };
  }

  const startedAt = Date.now();
  try {
    const list = await getList(campaign.clickup_list_id);
    return {
      key: 'clickup',
      label: 'ClickUp',
      connected: true,
      summary: 'Conectado',
      detail: list.folder?.name ?? list.name,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message =
      error instanceof ClickUpApiError ? error.body : error instanceof Error ? error.message : 'Falha ao validar';
    return {
      key: 'clickup',
      label: 'ClickUp',
      connected: false,
      summary: 'Falha de conexao',
      detail: message,
      latencyMs: Date.now() - startedAt,
    };
  }
}

async function checkCanva() {
  const token = await getCanvaAccessToken();
  if (token) {
    return {
      key: 'canva',
      label: 'Canva',
      connected: true,
      summary: 'Conectado',
      detail: 'Templates prontos para uso',
    };
  }

  return {
    key: 'canva',
    label: 'Canva',
    connected: false,
    summary: 'Desconectado',
    detail: 'Autentique a conta para gerar criativos',
    actionHref: '/api/canva/authorize',
    actionLabel: 'Conectar',
  };
}
