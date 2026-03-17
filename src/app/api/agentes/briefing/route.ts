// Sub-agente de Briefing
// 1. Busca campanha no Supabase
// 2. Gera documento de briefing via Claude
// 3. Cria lista no ClickUp dentro da pasta Campanhas
// 4. Salva briefing como doc no ClickUp
// 5. Atualiza campanha com clickup_list_id
// 6. Salva output na tabela campanha_outputs

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createList, createDoc } from '@/lib/clickup';
import { logAgente, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

const SYSTEM_PROMPT = `Você é um especialista em marketing digital para o mercado brasileiro de ferramentas PDR (Paintless Dent Repair) automotivo.
A Fast PDR Tools é uma empresa de Curitiba que vende ferramentas profissionais para reparadores de amassados sem pintura.
Seu público: profissionais PDR autônomos, iniciantes, técnicos de granizo, e revendedores.

Gere um briefing completo e estratégico de campanha de marketing em Markdown.
Seja específico, use os dados fornecidos, escreva em português do Brasil.
Tom: profissional, direto, orientado a resultados.`;

function buildBriefingPrompt(campanha: Record<string, unknown>): string {
  const linhas = [
    `# Briefing: ${campanha.nome}`,
    `**Período:** ${campanha.periodo_inicio} a ${campanha.periodo_fim}`,
    `**Produto em destaque:** ${campanha.produto_destaque}`,
  ];

  if (campanha.url_produto) linhas.push(`**URL do produto:** ${campanha.url_produto}`);

  const promocao: string[] = [];
  if (campanha.desconto_pix) promocao.push(`PIX ${campanha.desconto_pix}% off`);
  if (campanha.desconto_cartao) promocao.push(`Cartão ${campanha.desconto_cartao}% off`);
  if (campanha.parcelamento) promocao.push(`Parcelamento: ${campanha.parcelamento}`);
  if (promocao.length) linhas.push(`**Promoção:** ${promocao.join(' | ')}`);

  if (Array.isArray(campanha.publico)) {
    linhas.push(`**Público-alvo:** ${(campanha.publico as string[]).join(', ')}`);
  }
  if (Array.isArray(campanha.canais)) {
    linhas.push(`**Canais:** ${(campanha.canais as string[]).join(', ')}`);
  }
  if (campanha.tom) linhas.push(`**Tom:** ${campanha.tom}`);
  if (campanha.mensagem_central) linhas.push(`**Mensagem central:** ${campanha.mensagem_central}`);

  linhas.push('');
  linhas.push(`Com base nessas informações, gere um briefing completo com as seções:
## 1. Visão Geral
## 2. Objetivos e Metas
## 3. Produto e Proposta de Valor
## 4. Promoção Detalhada
## 5. Público-Alvo e Segmentação
## 6. Tom, Voz e Diretrizes de Comunicação
## 7. Estratégia por Canal
## 8. Call to Action Principal
## 9. Diferencias Competitivos
## 10. Checklist de Ativação`);

  return linhas.join('\n');
}

export async function POST(req: Request) {
  // Valida chamada interna
  if (!validateInternalSecret(req)) return unauthorizedResponse();

  let campanhaId: string;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  await logAgente(campanhaId, 'briefing', 'iniciado', 'Gerando briefing via Claude');

  try {
    // 1. Busca campanha
    const { data: campanha, error } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (error || !campanha) {
      throw new Error(`Campanha ${campanhaId} não encontrada`);
    }

    // 2. Gera briefing com Claude
    const generationStartedAt = Date.now();
    const briefingMarkdown = await generateText(
      SYSTEM_PROMPT,
      buildBriefingPrompt(campanha as Record<string, unknown>),
      1800
    );
    console.log('[briefing] Claude finalizou em ms:', Date.now() - generationStartedAt);

    // 3. Cria lista no ClickUp dentro da pasta Campanhas
    const clickupStartedAt = Date.now();
    const lista = await createList(campanha.nome);
    console.log('[briefing] lista ClickUp criada:', lista.id);

    // 4. Cria doc de briefing no ClickUp
    const doc = await createDoc(
      `Briefing — ${campanha.nome}`,
      briefingMarkdown
    );
    console.log('[briefing] doc ClickUp criado:', doc.id);
    console.log('[briefing] ClickUp finalizado em ms:', Date.now() - clickupStartedAt);

    // 5. Atualiza campanha com IDs do ClickUp
    await supabaseAdmin
      .from('campanhas')
      .update({
        clickup_list_id: lista.id,
        clickup_folder_id: process.env.CLICKUP_CAMPANHAS_FOLDER_ID,
        status: 'em_revisao',
      })
      .eq('id', campanhaId);

    // 6. Salva output
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
