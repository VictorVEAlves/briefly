// Sub-agente de Tasks
// Cria tasks no ClickUp baseado nos canais selecionados na campanha
// Tasks com agente_responsavel disparam os agentes via webhook ClickUp

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase';
import { createTask, calcularDueDate } from '@/lib/clickup';
import {
  callAgent,
  logAgente,
  validateInternalSecret,
  unauthorizedResponse,
} from '@/lib/agente-utils';

// Retorna o array de tasks a criar baseado nos canais e nas datas da campanha
function buildTasks(
  canais: string[],
  periodoInicio: string
): Array<{
  name: string;
  description?: string;
  due_date?: number;
  priority?: number;
  tags?: string[];
}> {
  const tasks = [];

  // Tasks geradas por agentes IA — tag indica qual agente deve processar
  if (canais.includes('email')) {
    tasks.push({
      name: 'Copy Email Marketing',
      description: 'Gerado automaticamente pelo agente de email do Briefly',
      due_date: calcularDueDate(periodoInicio, -3),
      priority: 2,
      tags: ['agente:email'],
    });
  }

  if (canais.includes('whatsapp')) {
    tasks.push({
      name: 'Copy WhatsApp',
      description: 'Gerado automaticamente pelo agente de WhatsApp do Briefly',
      due_date: calcularDueDate(periodoInicio, -3),
      priority: 2,
      tags: ['agente:whatsapp'],
    });
  }

  if (canais.includes('instagram_feed')) {
    tasks.push({
      name: 'Arte Instagram Feed (1080x1080)',
      description: 'Gerado automaticamente pelo agente de artes do Briefly',
      due_date: calcularDueDate(periodoInicio, -4),
      priority: 1,
      tags: ['agente:artes'],
    });
  }

  if (canais.includes('instagram_stories')) {
    tasks.push({
      name: 'Arte Instagram Stories (1080x1920)',
      description: 'Gerado automaticamente pelo agente de artes do Briefly',
      due_date: calcularDueDate(periodoInicio, -4),
      priority: 1,
      tags: ['agente:artes'],
    });
  }

  // Tasks humanas (sem agente_responsavel)
  tasks.push({
    name: 'Cadastrar preços no Shopify',
    due_date: calcularDueDate(periodoInicio, -5),
    priority: 1,
  });

  tasks.push({
    name: 'Revisão e aprovação geral',
    due_date: calcularDueDate(periodoInicio, -1),
    priority: 1,
  });

  if (canais.includes('email')) {
    tasks.push({
      name: 'Disparo email marketing',
      due_date: calcularDueDate(periodoInicio, 0),
      priority: 2,
    });
  }

  if (canais.includes('whatsapp')) {
    tasks.push({
      name: 'Disparo WhatsApp',
      due_date: calcularDueDate(periodoInicio, 0),
      priority: 2,
    });
  }

  tasks.push({
    name: 'Análise meio de campanha',
    due_date: calcularDueDate(periodoInicio, 3),
    priority: 3,
  });

  tasks.push({
    name: 'Análise fim de campanha',
    due_date: calcularDueDate(periodoInicio, 7),
    priority: 3,
  });

  return tasks;
}

function getAgentTag(tags?: string[]): string | null {
  const agentTag = tags?.find((tag) => tag.startsWith('agente:'));
  return agentTag ? agentTag.replace('agente:', '') : null;
}

async function dispatchGeneratedAgents(
  baseUrl: string,
  campanhaId: string,
  createdTasks: Array<{ id: string; tags?: string[] }>
): Promise<void> {
  const firstTaskByAgent = new Map<string, string>();

  for (const task of createdTasks) {
    const agent = getAgentTag(task.tags);
    if (agent && !firstTaskByAgent.has(agent)) {
      firstTaskByAgent.set(agent, task.id);
    }
  }

  await Promise.allSettled(
    Array.from(firstTaskByAgent.entries()).map(async ([agent, taskId]) => {
      const pathByAgent: Record<string, string> = {
        email: '/api/agentes/email',
        whatsapp: '/api/agentes/whatsapp',
        artes: '/api/agentes/artes',
      };

      const path = pathByAgent[agent];
      if (!path) return;

      const response = await callAgent(path, { campanhaId, taskId }, { baseUrl });
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'erro desconhecido');
        throw new Error(`${agent} -> ${response.status}: ${errorText}`);
      }
    })
  ).then(async (results) => {
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      await logAgente(
        campanhaId,
        'tasks',
        'erro',
        `Falha ao disparar agentes apos criar tasks: ${failures.length}`
      );
      failures.forEach((failure) => {
        if (failure.status === 'rejected') {
          console.error('[tasks] falha ao disparar agente:', failure.reason);
        }
      });
    }
  });
}

export async function POST(req: Request) {
  if (!validateInternalSecret(req)) return unauthorizedResponse();

  let campanhaId: string;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  await logAgente(campanhaId, 'tasks', 'iniciado', 'Criando tasks no ClickUp');
  const baseUrl = new URL(req.url).origin;

  try {
    // 1. Busca campanha com o clickup_list_id já preenchido pelo agente de briefing
    const { data: campanha, error } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (error || !campanha) throw new Error(`Campanha ${campanhaId} não encontrada`);
    if (!campanha.clickup_list_id) throw new Error('clickup_list_id não disponível — briefing ainda não concluído');

    // 2. Monta e cria as tasks
    const tasksToCreate = buildTasks(
      campanha.canais as string[],
      campanha.periodo_inicio
    );

    const createdTasks: Array<{ id: string; name: string; tags?: string[] }> = [];
    for (const task of tasksToCreate) {
      const created = await createTask(campanha.clickup_list_id, task);
      createdTasks.push({ id: created.id, name: created.name, tags: task.tags });
      console.log(`[tasks] task criada: "${created.name}" (${created.id})`);
    }

    await logAgente(
      campanhaId,
      'tasks',
      'concluido',
      `${createdTasks.length} tasks criadas no ClickUp`
    );

    waitUntil(dispatchGeneratedAgents(baseUrl, campanhaId, createdTasks));

    return NextResponse.json({
      ok: true,
      taskIds: createdTasks.map((task) => task.id),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[tasks] erro:', msg);
    await logAgente(campanhaId, 'tasks', 'erro', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
