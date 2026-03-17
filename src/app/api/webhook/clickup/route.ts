// Webhook do ClickUp — recebe eventos de taskCreated
// Lê o custom field agente_responsavel e dispara o agente correto em background
// CRÍTICO: deve responder 200 imediatamente (ClickUp retenta se demorar >5s)

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase';
import { getTask } from '@/lib/clickup';
import { resolveAppBaseUrl } from '@/lib/agente-utils';

// Mapeia o valor do custom field para o path do agente
const AGENT_PATHS: Record<string, string> = {
  email: '/api/agentes/email',
  whatsapp: '/api/agentes/whatsapp',
  artes: '/api/agentes/artes',
};

// Valida a assinatura HMAC-SHA256 do webhook do ClickUp
function validateSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.CLICKUP_WEBHOOK_SECRET!;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Dispara o agente correspondente em background
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

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  // 1. Lê body como texto para calcular HMAC (deve ser antes do json())
  const body = await req.text();
  const signature = req.headers.get('x-signature');

  // 2. Valida assinatura — rejeita se inválida
  if (!validateSignature(body, signature)) {
    console.warn('[webhook] assinatura inválida recebida');
    return new Response('Unauthorized', { status: 401 });
  }

  // 3. Parse do evento
  let event: { event: string; task_id?: string };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // 4. Ignora eventos que não sejam taskCreated
  if (event.event !== 'taskCreated' || !event.task_id) {
    return NextResponse.json({ ok: true });
  }

  // 5. Processamento assíncrono — responde 200 antes de processar
  waitUntil(
    (async () => {
      try {
        // Busca detalhes da task para ler a tag agente:xxx
        const task = await getTask(event.task_id!);

        const agenteTag = task.tags?.find((t) => t.name.startsWith('agente:'));

        if (!agenteTag) {
          // Task humana sem tag de agente — ignora silenciosamente
          return;
        }

        const agenteValue = agenteTag.name.replace('agente:', '');
        const agentePath = AGENT_PATHS[agenteValue];
        if (!agentePath) {
          console.warn(`[webhook] agente desconhecido: ${agenteValue}`);
          return;
        }

        // 6. Busca campanhaId pelo clickup_list_id
        const { data: campanha } = await supabaseAdmin
          .from('campanhas')
          .select('id')
          .eq('clickup_list_id', task.list.id)
          .single();

        if (!campanha) {
          console.warn(`[webhook] campanha não encontrada para list ${task.list.id}`);
          return;
        }

        console.log(`[webhook] disparando agente ${agenteValue} para campanha ${campanha.id}`);
        await dispatchAgent(agentePath, campanha.id, task.id, origin);
      } catch (err) {
        console.error('[webhook] erro no processamento:', err);
      }
    })()
  );

  return NextResponse.json({ ok: true });
}
