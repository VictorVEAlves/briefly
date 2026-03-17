// Briefing agent
// 1. Fetches campanha from Supabase
// 2. Generates the campaign briefing with Claude
// 3. Creates the ClickUp list inside the Campanhas folder
// 4. Creates the briefing doc in the same ClickUp list
// 5. Persists ClickUp IDs on campanha
// 6. Saves the output in campanha_outputs

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createList, createDoc } from '@/lib/clickup';
import { logAgente, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

const SYSTEM_PROMPT = `Voce e um especialista em marketing digital para o mercado brasileiro de ferramentas PDR (Paintless Dent Repair) automotivo.
A Fast PDR Tools e uma empresa de Curitiba que vende ferramentas profissionais para reparadores de amassados sem pintura.
Seu publico: profissionais PDR autonomos, iniciantes, tecnicos de granizo e revendedores.

Gere um briefing completo e estrategico de campanha de marketing em Markdown.
Seja especifico, use os dados fornecidos e escreva em portugues do Brasil.
Tom: profissional, direto, orientado a resultados.`;

function buildBriefingPrompt(campanha: Record<string, unknown>): string {
  const linhas = [
    `# Briefing: ${campanha.nome}`,
    `**Periodo:** ${campanha.periodo_inicio} a ${campanha.periodo_fim}`,
    `**Produto em destaque:** ${campanha.produto_destaque}`,
  ];

  if (campanha.url_produto) linhas.push(`**URL do produto:** ${campanha.url_produto}`);

  const promocao: string[] = [];
  if (campanha.desconto_pix) promocao.push(`PIX ${campanha.desconto_pix}% off`);
  if (campanha.desconto_cartao) promocao.push(`Cartao ${campanha.desconto_cartao}% off`);
  if (campanha.parcelamento) promocao.push(`Parcelamento: ${campanha.parcelamento}`);
  if (promocao.length) linhas.push(`**Promocao:** ${promocao.join(' | ')}`);

  if (Array.isArray(campanha.publico)) {
    linhas.push(`**Publico-alvo:** ${(campanha.publico as string[]).join(', ')}`);
  }
  if (Array.isArray(campanha.canais)) {
    linhas.push(`**Canais:** ${(campanha.canais as string[]).join(', ')}`);
  }
  if (campanha.tom) linhas.push(`**Tom:** ${campanha.tom}`);
  if (campanha.mensagem_central) linhas.push(`**Mensagem central:** ${campanha.mensagem_central}`);

  linhas.push('');
  linhas.push(`Com base nessas informacoes, gere um briefing completo com as secoes:
## 1. Visao Geral
## 2. Objetivos e Metas
## 3. Produto e Proposta de Valor
## 4. Promocao Detalhada
## 5. Publico-Alvo e Segmentacao
## 6. Tom, Voz e Diretrizes de Comunicacao
## 7. Estrategia por Canal
## 8. Call to Action Principal
## 9. Diferenciais Competitivos
## 10. Checklist de Ativacao`);

  return linhas.join('\n');
}

export async function POST(req: Request) {
  if (!validateInternalSecret(req)) return unauthorizedResponse();

  let campanhaId: string;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  await logAgente(campanhaId, 'briefing', 'iniciado', 'Gerando briefing via Claude');

  try {
    const { data: campanha, error } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (error || !campanha) {
      throw new Error(`Campanha ${campanhaId} nao encontrada`);
    }

    const generationStartedAt = Date.now();
    const briefingMarkdown = await generateText(
      SYSTEM_PROMPT,
      buildBriefingPrompt(campanha as Record<string, unknown>),
      1800
    );
    console.log('[briefing] Claude finalizou em ms:', Date.now() - generationStartedAt);

    const clickupStartedAt = Date.now();
    const lista = await createList(campanha.nome);
    console.log('[briefing] lista ClickUp criada:', lista.id);

    const doc = await createDoc(`Briefing - ${campanha.nome}`, briefingMarkdown, {
      id: lista.id,
      type: 6,
    });
    console.log('[briefing] doc ClickUp criado:', doc.id);
    console.log('[briefing] ClickUp finalizado em ms:', Date.now() - clickupStartedAt);

    await supabaseAdmin
      .from('campanhas')
      .update({
        clickup_list_id: lista.id,
        clickup_folder_id: process.env.CLICKUP_CAMPANHAS_FOLDER_ID,
        status: 'em_revisao',
      })
      .eq('id', campanhaId);

    await supabaseAdmin.from('campanha_outputs').insert({
      campanha_id: campanhaId,
      tipo: 'briefing',
      conteudo: briefingMarkdown,
      clickup_doc_id: doc.id,
      status: 'pronto',
    });

    await logAgente(campanhaId, 'briefing', 'concluido', `Lista: ${lista.id} | Doc: ${doc.id}`);

    return NextResponse.json({ ok: true, listId: lista.id, docId: doc.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[briefing] erro:', msg);
    await logAgente(campanhaId, 'briefing', 'erro', msg);
    await supabaseAdmin
      .from('campanha_outputs')
      .upsert({ campanha_id: campanhaId, tipo: 'briefing', status: 'erro', conteudo: null })
      .eq('campanha_id', campanhaId);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
