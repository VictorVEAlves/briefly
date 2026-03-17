// Sub-agente de WhatsApp
// 1. Busca campanha e briefing do Supabase
// 2. Claude gera mensagens por segmento/lista em JSON
// 3. Salva em campanha_outputs
// 4. Cria doc no ClickUp com as mensagens
// 5. Atualiza task para "in review"

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText, parseJsonFromResponse } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';
import type { WhatsAppMessage } from '@/types/campanha';

const SYSTEM_PROMPT = `Você é um copywriter especializado em mensagens de WhatsApp marketing para ferramentas de PDR automotivo.
Escreve para a Fast PDR Tools, empresa de Curitiba.

Regras:
- Máximo 3 parágrafos curtos por mensagem
- Primeira linha: saudação com {{nome}} (variável de personalização)
- Destaque o desconto PIX se disponível
- Link do produto no final
- Use emojis moderadamente (1-2 por mensagem)
- Escreva em português do Brasil informal mas profissional

IMPORTANTE: Sua resposta deve ser APENAS um JSON array válido, sem markdown, sem explicações.
Formato: [{"lista": "nome_da_lista", "mensagem": "texto completo da mensagem"}]`;

function buildWhatsAppPrompt(campanha: Record<string, unknown>, briefingContent: string, listas: string[]): string {
  const listasTexto = listas.length > 0 ? listas.join(', ') : 'base geral';

  return `Gere mensagens de WhatsApp para a campanha "${campanha.nome}" da Fast PDR Tools.

Listas a atingir: ${listasTexto}

Dados da campanha:
- Produto: ${campanha.produto_destaque}
- URL: ${campanha.url_produto ?? 'https://www.fastpdrtools.com.br'}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'não informado'}
- Parcelamento: ${campanha.parcelamento ?? 'não informado'}
- Tom: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? ''}

Resumo do briefing:
${briefingContent.slice(0, 1000)}

Gere uma mensagem personalizada para cada lista: ${listasTexto}.
Retorne SOMENTE o JSON array no formato especificado.`;
}

// Valida que o resultado do Claude tem o formato esperado
function validateMessages(data: unknown): data is WhatsAppMessage[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).lista === 'string' &&
        typeof (item as Record<string, unknown>).mensagem === 'string'
    )
  );
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
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  await logAgente(campanhaId, 'whatsapp', 'iniciado', 'Gerando mensagens WhatsApp via Claude');

  const { data: outputRow } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'whatsapp', status: 'gerando' })
    .select()
    .single();

  try {
    // 1. Busca campanha
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha não encontrada');

    // 2. Busca briefing para contexto
    const { data: briefingOutput } = await supabaseAdmin
      .from('campanha_outputs')
      .select('conteudo')
      .eq('campanha_id', campanhaId)
      .eq('tipo', 'briefing')
      .single();

    const briefingContent = briefingOutput?.conteudo ?? '';

    // 3. Determina listas (busca do log inicial onde salvamos os dados extras)
    // Como listas_whatsapp não está na tabela campanhas, usa fallback para 'base geral'
    // Para enviar listas, o orquestrador precisaria salvar em agente_logs
    const listas = ['base geral']; // fallback padrão

    // 4. Gera mensagens via Claude
    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildWhatsAppPrompt(campanha as Record<string, unknown>, briefingContent, listas)
    );

    // 5. Parseia JSON da resposta (trata possível wrapper ```json ... ```)
    let messages: WhatsAppMessage[];
    try {
      const parsed = parseJsonFromResponse<unknown>(rawResponse);
      if (!validateMessages(parsed)) {
        throw new Error('Formato JSON inválido');
      }
      messages = parsed;
    } catch {
      throw new Error(`Claude retornou formato inválido para WhatsApp: ${rawResponse.slice(0, 200)}`);
    }

    const conteudo = JSON.stringify(messages, null, 2);

    // 6. Formata mensagens como Markdown para o doc do ClickUp
    const docContent = messages
      .map((m) => `## Lista: ${m.lista}\n\n${m.mensagem}`)
      .join('\n\n---\n\n');

    const doc = await createDoc(`WhatsApp — ${campanha.nome}`, docContent);

    // 7. Atualiza output
    await supabaseAdmin
      .from('campanha_outputs')
      .update({ conteudo, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', outputRow!.id);

    // 8. Atualiza task
    if (taskId) {
      await updateTask(taskId, { status: 'in review' }).catch((e) =>
        console.warn('[whatsapp] falha ao atualizar task:', e.message)
      );
    }

    await logAgente(campanhaId, 'whatsapp', 'concluido', `${messages.length} mensagens | Doc: ${doc.id}`);
    return NextResponse.json({ ok: true, docId: doc.id, count: messages.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[whatsapp] erro:', msg);
    await logAgente(campanhaId, 'whatsapp', 'erro', msg);

    if (outputRow?.id) {
      await supabaseAdmin
        .from('campanha_outputs')
        .update({ status: 'erro' })
        .eq('id', outputRow.id);
    }

    if (taskId) {
      await updateTask(taskId, { status: 'blocked' }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
