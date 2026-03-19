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

import { FAST_BRAND_CONTEXT } from '@/lib/brand-context';

const SYSTEM_PROMPT = `Voce e o analista de performance digital da Fast PDR Tools. Seu trabalho e transformar dados brutos de GA4 e Google Search Console em decisoes acionaveis.

${FAST_BRAND_CONTEXT}

## Seu papel

Voce nao faz relatorio descritivo ("as sessoes foram 23k"). Voce faz relatorio ANALITICO ("23k sessoes, queda de 21% vs periodo anterior — provavel causa: fim da temporada de granizo. Acao: testar campanha de manutencao preventiva").

## Principios de analise

1. TODO numero precisa de CONTEXTO: comparacao com periodo anterior, benchmark, ou explicacao.
2. Destaque o que MUDOU, nao o que esta igual. "CTR subiu de 3.1% para 4.3%" e mais util que "CTR esta em 4.3%".
3. Conecte os dados com ACOES: cada insight deve ter um "e dai?" — o que fazemos com essa informacao?
4. Seja honesto sobre limitacoes: se os dados sao insuficientes, diga. Nao invente narrativas.
5. Pense como dono do negocio: o leitor quer saber se ta vendendo mais ou menos, e o que fazer a respeito.

## Formato obrigatorio

# Relatorio de Performance: [Nome da Campanha]
*Periodo: [data inicio] a [data fim]*

## Resumo executivo
3-4 frases. O que aconteceu, se foi bom ou ruim, e a acao principal recomendada.

## SEO — Google Search Console
- Impressoes, Cliques, CTR, Posicao media (com variacao vs periodo anterior quando disponivel)
- Top keywords por cliques
- Insight: o que isso significa pro negocio

## Trafego — Google Analytics 4
- Sessoes, Conversoes, Receita (com variacao quando disponivel)
- Atribuicao: como o GA4 identificou o trafego desta campanha (campo matchedField e matchedValue)
- Insight: o trafego esta convertendo?

## Conexao campanha -> resultado
A campanha gerou trafego incremental? Ha correlacao entre o periodo da campanha e picos nos dados?
Se os dados nao permitem atribuicao direta, explicar por que (falta de UTMs, periodo curto, etc).

## Recomendacoes (top 3)
Cada recomendacao deve ser especifica, acionavel e mensuravel.

## Riscos e limitacoes dos dados
O que pode estar errado ou incompleto. Configuracao de GA4, filtros, periodo curto, etc.`;

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
  const ga4 = snapshot.ga4;
  const gsc = snapshot.gsc;

  const fmt = (n: number | undefined | null) =>
    n != null ? n.toLocaleString('pt-BR') : 'nao disponivel';
  const fmtPct = (n: number | undefined | null) =>
    n != null ? `${(n * 100).toFixed(1)}%` : 'nao disponivel';
  const fmtMoney = (n: number | undefined | null) =>
    n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'nao disponivel';

  const keywordsText = gsc.keywords?.length
    ? gsc.keywords
        .slice(0, 10)
        .map((k, i) => `  ${i + 1}. "${k.keyword}" — ${k.clicks} cliques, pos ${k.averagePosition?.toFixed(1)}, CTR ${(k.ctr * 100).toFixed(1)}%`)
        .join('\n')
    : '  nao disponivel';

  return `CAMPANHA: ${campanha.nome}
PRODUTO: ${campanha.produto_destaque}
MENSAGEM CENTRAL: ${campanha.mensagem_central ?? 'nao informada'}
PERIODO DA CAMPANHA: ${campanha.periodo_inicio} a ${campanha.periodo_fim}
JANELA ANALISADA: ${snapshot.dateRange.startDate} a ${snapshot.dateRange.endDate}

--- DADOS GOOGLE SEARCH CONSOLE ---
Impressoes: ${fmt(gsc.impressions)}
Cliques: ${fmt(gsc.clicks)}
CTR: ${fmtPct(gsc.ctr)}
Posicao media: ${gsc.averagePosition?.toFixed(1) ?? 'nao disponivel'}

Top palavras-chave por cliques:
${keywordsText}

--- DADOS GOOGLE ANALYTICS 4 ---
Sessoes: ${fmt(ga4.sessions)}
Conversoes: ${fmt(ga4.conversions)}
Taxa de conversao: ${fmtPct(ga4.conversionRate)}
Receita: ${fmtMoney(ga4.revenue)}
Atribuicao GA4: campo="${ga4.matchedField ?? 'nenhum'}" valor="${ga4.matchedValue ?? 'nenhum'}" tipo="${ga4.matchType ?? 'nenhum'}"

Gere o relatorio seguindo a estrutura obrigatoria definida no system prompt.
Se algum dado estiver zerado ou ausente, explique a limitacao em vez de ignorar.`;
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
      3200
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
