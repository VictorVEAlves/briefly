export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import {
  fetchCampaignAnalytics,
  hasAnalyticsConfig,
  type CampaignAnalyticsSnapshot,
} from '@/lib/analytics';
import {
  logAgente,
  setAgentStatus,
  validateInternalSecret,
  unauthorizedResponse,
} from '@/lib/agente-utils';

const SYSTEM_PROMPT = `Voce e um analista de performance digital senior para a Fast PDR Tools.
Seu trabalho e transformar dados de GA4 e Google Search Console em um relatorio executivo e acionavel.

Regras:
- Escreva em portugues do Brasil
- Formato em Markdown
- Seja objetivo, mas profundo
- Sempre destaque contexto, aprendizados, riscos e proximos passos
- Nao invente numeros
- Quando os dados estiverem baixos ou zerados, explique a limitacao com clareza

Estrutura obrigatoria:
# Relatorio de Performance
## 1. Resumo executivo
## 2. GA4
## 3. Search Console
## 4. Principais insights
## 5. Recomendacoes acionaveis
## 6. Riscos e observacoes de dados`;

function buildPrompt(
  campanha: {
    nome: string;
    produto_destaque: string;
    mensagem_central: string | null;
    periodo_inicio: string;
    periodo_fim: string;
  },
  snapshot: CampaignAnalyticsSnapshot
) {
  return [
    `Campanha: ${campanha.nome}`,
    `Produto: ${campanha.produto_destaque}`,
    `Mensagem central: ${campanha.mensagem_central ?? 'nao informada'}`,
    `Periodo da campanha: ${campanha.periodo_inicio} ate ${campanha.periodo_fim}`,
    `Janela analisada: ${snapshot.dateRange.startDate} ate ${snapshot.dateRange.endDate}`,
    `Propriedade Search Console: ${snapshot.searchConsoleSiteUrl}`,
    '',
    'Dados GA4:',
    JSON.stringify(snapshot.ga4, null, 2),
    '',
    'Dados Search Console:',
    JSON.stringify(snapshot.gsc, null, 2),
    '',
    'Gere o relatorio em Markdown seguindo exatamente a estrutura obrigatoria.',
  ].join('\n');
}

function buildTaskDescription(docId: string, docTitle: string, report: string) {
  const preview = report.length > 2400 ? `${report.slice(0, 2400).trim()}\n\n[relatorio truncado]` : report;

  return [
    'Relatorio automatico de performance gerado pelo agente de analytics do Briefly.',
    '',
    `Doc ClickUp: ${docTitle}`,
    `Doc ID: ${docId}`,
    '',
    preview,
  ].join('\n');
}

export async function POST(req: Request) {
  if (!validateInternalSecret(req)) return unauthorizedResponse();

  let campanhaId: string;
  let taskId: string | undefined;

  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    taskId = body.taskId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  if (!hasAnalyticsConfig()) {
    return NextResponse.json(
      {
        error:
          'Analytics Google nao configurado. Defina GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_GA4_PROPERTY_ID.',
      },
      { status: 500 }
    );
  }

  await logAgente(campanhaId, 'analytics', 'iniciado', 'Coletando GA4 e Search Console');

  const { data: outputRow } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'relatorio', status: 'gerando' })
    .select()
    .single();

  try {
    const { data: campanha, error } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (error || !campanha) {
      throw new Error('Campanha nao encontrada');
    }

    await setAgentStatus('analytics', 'working', `Analytics - ${campanha.nome}`, campanhaId);

    const analyticsSnapshot = await fetchCampaignAnalytics({
      campaignName: campanha.nome,
      produtoDestaque: campanha.produto_destaque,
      productUrl: campanha.url_produto,
      periodoInicio: campanha.periodo_inicio,
      periodoFim: campanha.periodo_fim,
    });

    const reportMarkdown = await generateText(
      SYSTEM_PROMPT,
      buildPrompt(
        {
          nome: campanha.nome,
          produto_destaque: campanha.produto_destaque,
          mensagem_central: campanha.mensagem_central,
          periodo_inicio: campanha.periodo_inicio,
          periodo_fim: campanha.periodo_fim,
        },
        analyticsSnapshot
      ),
      2400
    );

    const doc = await createDoc(
      `Relatorio Analytics - ${campanha.nome}`,
      reportMarkdown,
      campanha.clickup_list_id ? { id: campanha.clickup_list_id, type: 6 } : undefined
    );

    await supabaseAdmin
      .from('campanha_outputs')
      .update({
        conteudo: reportMarkdown,
        clickup_doc_id: doc.id,
        status: 'aprovado',
      })
      .eq('id', outputRow!.id);

    if (taskId) {
      await updateTask(taskId, {
        status: 'em revisão',
        description: buildTaskDescription(doc.id, doc.title, reportMarkdown),
      }).catch((updateError) =>
        console.warn('[analytics] falha ao atualizar task:', updateError instanceof Error ? updateError.message : updateError)
      );
    }

    await setAgentStatus('analytics', 'idle', null, null);
    await logAgente(
      campanhaId,
      'analytics',
      'concluido',
      `GA4 ${analyticsSnapshot.ga4.sessions} sessoes | GSC ${analyticsSnapshot.gsc.impressions} impressoes | Doc: ${doc.id}`
    );

    return NextResponse.json({
      ok: true,
      docId: doc.id,
      ga4: analyticsSnapshot.ga4,
      gsc: {
        clicks: analyticsSnapshot.gsc.clicks,
        impressions: analyticsSnapshot.gsc.impressions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[analytics] erro:', message);

    await setAgentStatus('analytics', 'error', `Erro: ${message}`, campanhaId);
    await logAgente(campanhaId, 'analytics', 'erro', message);

    if (outputRow?.id) {
      await supabaseAdmin
        .from('campanha_outputs')
        .update({ status: 'erro' })
        .eq('id', outputRow.id);
    }

    if (taskId) {
      await updateTask(taskId, { status: 'bloqueado' }).catch(() => {});
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
