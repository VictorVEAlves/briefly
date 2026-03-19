// WhatsApp agent
// 1. Fetches campanha and briefing from Supabase
// 2. Claude generates list-specific WhatsApp messages in JSON
// 3. Saves the output in campanha_outputs
// 4. Creates a ClickUp doc with the rendered messages
// 5. Updates the ClickUp task with doc metadata and message preview

export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText, parseJsonFromResponse } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, setAgentStatus, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';
import type { WhatsAppMessage } from '@/types/campanha';
import { buildUtmUrl, campaignToSlug } from '@/lib/utm';
import { FAST_BRAND_CONTEXT } from '@/lib/brand-context';

const SYSTEM_PROMPT = `Voce e o copywriter de WhatsApp da Fast PDR Tools. Voce recebe um briefing estrategico e gera mensagens prontas para disparo.

${FAST_BRAND_CONTEXT}

## Seu papel

Criar mensagens de WhatsApp curtas, diretas e que geram clique. Cada lista recebe uma mensagem com angulo diferente.

## Angulos por lista (SEGUIR SEMPRE)

- **grupo_vip**: Escassez + exclusividade. Esses sao os melhores clientes. Eles recebem primeiro, com vantagem que outros nao tem. Tom: "Voce ta recebendo antes de todo mundo."
- **tallos**: Recorrencia + rotina profissional. Sao tecnicos que compram com frequencia. Tom: "Hora de repor o kit" ou "Essa ferramenta nova vai acelerar seu servico."
- **base_geral**: Volume + oportunidade. Publico mais amplo, muitos ainda nao compraram. Tom: "Conhece a Fast? Essa e a hora de testar." ou "O desconto que faltava pra voce montar seu kit."

## Regras de formatacao

1. Primeira linha: saudacao com {{nome}} — ex: "Fala, {{nome}}! 🔧"
2. Maximo 3 paragrafos curtos (2-3 linhas cada)
3. Emojis: maximo 2-3 por mensagem, usados como marcadores visuais no inicio de linha
4. Link do produto no final, nunca no meio
5. CTA direto na ultima linha: "Acessa aqui e garante o seu:" + link
6. Tom: informal tecnico. Como um vendedor que conhece o cliente pelo nome.

## Especificidade

- "18% no PIX = R$ 630 de economia no Kit Granizo Pro" >>> "desconto especial"
- "Estoque pronto, sai de Curitiba amanha" >>> "entrega rapida"
- "So 12 unidades em estoque" >>> "estoque limitado" (se for verdade)

## Formato de saida OBRIGATORIO

Retorne APENAS um JSON array valido. Sem markdown, sem explicacao, sem texto antes ou depois.

[
  {"lista": "grupo_vip", "mensagem": "texto completo da mensagem com {{nome}} e link"},
  {"lista": "tallos", "mensagem": "texto completo"},
  {"lista": "base_geral", "mensagem": "texto completo"}
]`;

type UtmUrls = { grupo_vip: string; tallos: string; base_geral: string };

function buildWhatsAppPrompt(
  campanha: Record<string, unknown>,
  briefingContent: string,
  listas: string[],
  utmUrls: UtmUrls
): string {
  return `BRIEFING ESTRATEGICO DA CAMPANHA (leia TUDO antes de escrever):

${briefingContent}

---

DADOS OPERACIONAIS:
- Campanha: ${campanha.nome}
- Produto: ${campanha.produto_destaque}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'nao informado'}
- Parcelamento: ${campanha.parcelamento ?? 'nao informado'}
- Tom: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? 'extrair do briefing'}

URLS POR LISTA (usar a URL correta em cada mensagem):
- grupo_vip: ${utmUrls.grupo_vip}
- tallos: ${utmUrls.tallos}
- base_geral: ${utmUrls.base_geral}

INSTRUCOES:
1. Leia o briefing INTEIRO, especialmente a secao 7 (Estrategia por Canal > WhatsApp).
2. Use os angulos definidos no briefing para cada lista.
3. Use o CTA da secao 8.
4. Calcule a economia real se houver dados.
5. Cada mensagem deve ter a URL correta da sua lista (${listas.join(', ')}).
6. Retorne APENAS o JSON array, nada mais.`;
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
    // Listas padrão da Fast PDR Tools — cada uma recebe mensagem com ângulo diferente
    // grupo_vip = escassez/exclusividade | tallos = recorrência | base_geral = volume
    const listas = ['grupo_vip', 'tallos', 'base_geral'];
    const baseUrl = (campanha.url_produto as string | null) ?? 'https://www.fastpdrtools.com.br';
    const slug = campaignToSlug(campanha.nome as string);
    const utmUrls: UtmUrls = {
      grupo_vip: buildUtmUrl(baseUrl, 'whatsapp_vip', slug),
      tallos: buildUtmUrl(baseUrl, 'whatsapp_tallos', slug),
      base_geral: buildUtmUrl(baseUrl, 'whatsapp_base', slug),
    };

    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildWhatsAppPrompt(campanha as Record<string, unknown>, briefingContent, listas, utmUrls),
      2000
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
