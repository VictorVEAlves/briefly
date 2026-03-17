// Webhook do ClickUp
// - taskCreated: dispara agentes downstream a partir das tags da task
// - listDeleted: arquiva a campanha correspondente no Supabase
// Deve responder 200 rapidamente para evitar retry desnecessario

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase';
import { archiveCampaignByClickupListId } from '@/lib/campaign-archive';
import { getTask } from '@/lib/clickup';
import { resolveAppBaseUrl } from '@/lib/agente-utils';

const AGENT_PATHS: Record<string, string> = {
  email: '/api/agentes/email',
  whatsapp: '/api/agentes/whatsapp',
  artes: '/api/agentes/artes',
};

type ClickUpWebhookEvent =
  | {
      event: 'taskCreated';
      task_id?: string;
      webhook_id?: string;
    }
  | {
      event: 'listDeleted';
      list_id?: string;
      webhook_id?: string;
    }
  | {
      event: string;
      task_id?: string;
      list_id?: string;
      webhook_id?: string;
    };

function validateSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.CLICKUP_WEBHOOK_SECRET!;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function dispatchAgent(
  agentePath: string,
  campanhaId: string,
  taskId: string,
  origin: string
): Promise<void> {
  const baseUrl = resolveAppBaseUrl(origin);
  try {
    const res = await fetch(`${baseUrl}${agentePath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ campanhaId, taskId }),
    });
    if (!res.ok) {
      console.error(`[webhook] agente ${agentePath} retornou ${res.status}`);
    }
  } catch (err) {
    console.error(`[webhook] falha ao chamar agente ${agentePath}:`, err);
  }
}

async function processTaskCreated(event: Extract<ClickUpWebhookEvent, { event: 'taskCreated' }>, origin: string) {
  if (!event.task_id) return;

  const task = await getTask(event.task_id);
  const agenteTag = task.tags?.find((tag) => tag.name.startsWith('agente:'));

  if (!agenteTag) return;

  const agenteValue = agenteTag.name.replace('agente:', '');
  const agentePath = AGENT_PATHS[agenteValue];
  if (!agentePath) {
    console.warn(`[webhook] agente desconhecido: ${agenteValue}`);
    return;
  }

  const { data: campanha } = await supabaseAdmin
    .from('campanhas')
    .select('id')
    .eq('clickup_list_id', task.list.id)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();

  if (!campanha) {
    console.warn(`[webhook] campanha nao encontrada para list ${task.list.id}`);
    return;
  }

  console.log(`[webhook] disparando agente ${agenteValue} para campanha ${campanha.id}`);
  await dispatchAgent(agentePath, campanha.id, task.id, origin);
}

async function processListDeleted(event: Extract<ClickUpWebhookEvent, { event: 'listDeleted' }>) {
  if (!event.list_id) return;

  const result = await archiveCampaignByClickupListId(
    event.list_id,
    'clickup_deleted'
  );

  if (result.outcome === 'archived') {
    console.log(`[webhook] campanha ${result.campanhaId} arquivada via listDeleted`);
  }
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const body = await req.text();
  const signature = req.headers.get('x-signature');

  if (!validateSignature(body, signature)) {
    console.warn('[webhook] assinatura invalida recebida');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: ClickUpWebhookEvent;
  try {
    event = JSON.parse(body) as ClickUpWebhookEvent;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (event.event !== 'taskCreated' && event.event !== 'listDeleted') {
    return NextResponse.json({ ok: true });
  }

  waitUntil(
    (async () => {
      try {
        if (event.event === 'taskCreated') {
          await processTaskCreated(
            event as Extract<ClickUpWebhookEvent, { event: 'taskCreated' }>,
            origin
          );
          return;
        }

        await processListDeleted(
          event as Extract<ClickUpWebhookEvent, { event: 'listDeleted' }>
        );
      } catch (err) {
        console.error('[webhook] erro no processamento:', err);
      }
    })()
  );

  return NextResponse.json({ ok: true });
}
