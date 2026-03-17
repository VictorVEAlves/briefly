// Orquestrador principal da campanha
// 1. Salva campanha no Supabase
// 2. Responde imediatamente com campanhaId
// 3. Roda pipeline dos agentes em background via waitUntil

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { logAgente, callAgent } from '@/lib/agente-utils';

// Schema de validação do briefing recebido do formulário
const briefingSchema = z.object({
  nome: z.string().min(3),
  periodo_inicio: z.string().min(1),
  periodo_fim: z.string().min(1),
  produto_destaque: z.string().min(2),
  url_produto: z.string().optional(),
  produtos_secundarios: z.string().optional(),
  desconto_pix: z.number().optional(),
  desconto_cartao: z.number().optional(),
  parcelamento: z.string().optional(),
  cupom: z.string().optional(),
  publico: z.array(z.string()).min(1),
  listas_whatsapp: z.array(z.string()).optional(),
  canais: z.array(z.string()).min(1),
  tom: z.string().min(1),
  mensagem_central: z.string().optional(),
  argumento_principal: z.string().optional(),
});

// Roda os agentes de briefing e tasks em sequência
async function runAgentPipeline(campanhaId: string, baseUrl: string): Promise<void> {
  // Agente briefing: cria lista no ClickUp e gera o doc de briefing
  const briefingRes = await callAgent('/api/agentes/briefing', { campanhaId }, { baseUrl });
  if (!briefingRes.ok) {
    const err = await briefingRes.text().catch(() => 'erro desconhecido');
    console.error('[orchestrator] briefing agent falhou:', err);
    await supabaseAdmin
      .from('campanhas')
      .update({ status: 'erro' })
      .eq('id', campanhaId);
    return;
  }

  // Agente tasks: cria as tasks no ClickUp (depende do clickup_list_id criado pelo briefing)
  const tasksRes = await callAgent('/api/agentes/tasks', { campanhaId }, { baseUrl });
  if (!tasksRes.ok) {
    const err = await tasksRes.text().catch(() => 'erro desconhecido');
    console.error('[orchestrator] tasks agent falhou:', err);
  }

  console.log('[orchestrator] pipeline concluído para campanha:', campanhaId);
}

export async function POST(req: Request) {
  // 1. Valida input
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = briefingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados do formulário inválidos', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const baseUrl = new URL(req.url).origin;

  // 2. Salva campanha no Supabase com status 'gerando'
  const { data: campanha, error: dbError } = await supabaseAdmin
    .from('campanhas')
    .insert({
      nome: data.nome,
      periodo_inicio: data.periodo_inicio,
      periodo_fim: data.periodo_fim,
      produto_destaque: data.produto_destaque,
      url_produto: data.url_produto ?? null,
      desconto_pix: data.desconto_pix ?? null,
      desconto_cartao: data.desconto_cartao ?? null,
      parcelamento: data.parcelamento ?? null,
      publico: data.publico,
      canais: data.canais as never,
      tom: data.tom,
      mensagem_central: data.mensagem_central ?? null,
      status: 'gerando',
    })
    .select()
    .single();

  if (dbError || !campanha) {
    console.error('[orchestrator] erro ao salvar campanha:', dbError);
    return NextResponse.json({ error: 'Falha ao criar campanha no banco' }, { status: 500 });
  }

  // Salva campos extras (não mapeados na tabela) em agente_logs como contexto
  await logAgente(
    campanha.id,
    'orchestrator',
    'iniciado',
    `Campanha criada: ${campanha.nome} | canais: ${data.canais.join(', ')}`
  );

  // 3. Responde imediatamente — pipeline roda em background
  waitUntil(runAgentPipeline(campanha.id, baseUrl));

  return NextResponse.json({ campanhaId: campanha.id });
}
