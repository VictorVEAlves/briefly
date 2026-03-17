// WhatsApp agent
// 1. Fetches campanha and briefing from Supabase
// 2. Claude generates list-specific WhatsApp messages in JSON
// 3. Saves the output in campanha_outputs
// 4. Creates a ClickUp doc with the rendered messages
// 5. Updates the ClickUp task with doc metadata and message preview

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText, parseJsonFromResponse } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, setAgentStatus, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';
import type { WhatsAppMessage } from '@/types/campanha';

const SYSTEM_PROMPT = `Voce e um copywriter especializado em mensagens de WhatsApp marketing para ferramentas de PDR automotivo.
Escreve para a Fast PDR Tools, empresa de Curitiba.

Regras:
- Maximo 3 paragrafos curtos por mensagem
- Primeira linha: saudacao com {{nome}}
- Destaque o desconto PIX se disponivel
- Link do produto no final
- Use emojis moderadamente (1-2 por mensagem)
- Escreva em portugues do Brasil informal mas profissional

IMPORTANTE: Sua resposta deve ser apenas um JSON array valido, sem markdown e sem explicacoes.
Formato: [{"lista": "nome_da_lista", "mensagem": "texto completo da mensagem"}]`;

function buildWhatsAppPrompt(
  campanha: Record<string, unknown>,
  briefingContent: string,
  listas: string[]
): string {
  const listasTexto = listas.length > 0 ? listas.join(', ') : 'base geral';

  return `Gere mensagens de WhatsApp para a campanha "${campanha.nome}" da Fast PDR Tools.

Listas a atingir: ${listasTexto}

Dados da campanha:
- Produto: ${campanha.produto_destaque}
- URL: ${campanha.url_produto ?? 'https://www.fastpdrtools.com.br'}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'nao informado'}
- Parcelamento: ${campanha.parcelamento ?? 'nao informado'}
- Tom: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? ''}

Resumo do briefing:
${briefingContent.slice(0, 1000)}

Gere uma mensagem personalizada para cada lista: ${listasTexto}.
Retorne somente o JSON array no formato especificado.`;
}

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

function buildTaskDescription(docId: string, docTitle: string, messages: WhatsAppMessage[]): string {
  const preview = messages
    .map((message) => `Lista: ${message.lista}\n${message.mensagem}`)
    .join('\n\n---\n\n');

  const maxLength = 3500;
  const previewText =
    preview.length > maxLength ? `${preview.slice(0, maxLength).trim()}\n\n[conteudo truncado]` : preview;

  return [
    'Conteudo gerado automaticamente pelo agente de WhatsApp do Briefly.',
    '',
    `Doc ClickUp: ${docTitle}`,
    `Doc ID: ${docId}`,
    '',
    previewText,
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

  await logAgente(campanhaId, 'whatsapp', 'iniciado', 'Gerando mensagens WhatsApp via Claude');

  const { data: outputRow } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'whatsapp', status: 'gerando' })
    .select()
    .single();

  try {
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha nao encontrada');

    await setAgentStatus('whatsapp', 'working', `WhatsApp — ${campanha.nome}`, campanhaId);

    const { data: briefingOutput } = await supabaseAdmin
      .from('campanha_outputs')
      .select('conteudo')
      .eq('campanha_id', campanhaId)
      .eq('tipo', 'briefing')
      .single();

    const briefingContent = briefingOutput?.conteudo ?? '';
    const listas = ['base geral'];

    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildWhatsAppPrompt(campanha as Record<string, unknown>, briefingContent, listas),
      1200
    );

    let messages: WhatsAppMessage[];
    try {
      const parsed = parseJsonFromResponse<unknown>(rawResponse);
      if (!validateMessages(parsed)) throw new Error('Formato JSON invalido');
      messages = parsed;
    } catch {
      throw new Error(`Claude retornou formato invalido para WhatsApp: ${rawResponse.slice(0, 200)}`);
    }

    const conteudo = JSON.stringify(messages, null, 2);
    const docContent = messages.map((m) => `## Lista: ${m.lista}\n\n${m.mensagem}`).join('\n\n---\n\n');
    const doc = await createDoc(`WhatsApp - ${campanha.nome}`, docContent, campanha.clickup_list_id
      ? { id: campanha.clickup_list_id, type: 6 }
      : undefined);

    await supabaseAdmin
      .from('campanha_outputs')
      .update({ conteudo, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', outputRow!.id);

    if (taskId) {
      await updateTask(taskId, {
        status: 'em revisão',
        description: buildTaskDescription(doc.id, doc.title, messages),
      }).catch((e) => console.warn('[whatsapp] falha ao atualizar task:', e.message));
    }

    await setAgentStatus('whatsapp', 'idle', null, null);
    await logAgente(campanhaId, 'whatsapp', 'concluido', `${messages.length} mensagens | Doc: ${doc.id}`);
    return NextResponse.json({ ok: true, docId: doc.id, count: messages.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[whatsapp] erro:', msg);
    await setAgentStatus('whatsapp', 'error', `Erro: ${msg}`, campanhaId);
    await logAgente(campanhaId, 'whatsapp', 'erro', msg);

    if (outputRow?.id) {
      await supabaseAdmin
        .from('campanha_outputs')
        .update({ status: 'erro' })
        .eq('id', outputRow.id);
    }

    if (taskId) {
      await updateTask(taskId, { status: 'bloqueado' }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
