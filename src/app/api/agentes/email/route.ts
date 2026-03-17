// Sub-agente de Email Marketing
// 1. Busca briefing e campanha do Supabase
// 2. Claude gera HTML completo do email responsivo (cores Fast PDR)
// 3. Salva em campanha_outputs
// 4. Cria doc no ClickUp com o HTML
// 5. Atualiza task para "in review"

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

const SYSTEM_PROMPT = `Você é um copywriter especializado em e-mail marketing para ferramentas automotivas no Brasil.
Escreve para a Fast PDR Tools, empresa de Curitiba que vende ferramentas PDR profissionais.

Regras de marca:
- Header: fundo vermelho #CC0000, texto "Fast PDR Tools" em branco, sem logo externo
- Corpo: fundo branco, texto #1A1A1A, font-family Arial, sans-serif
- CTA buttons: fundo #CC0000, texto branco, border-radius 4px
- Footer: fundo #1A1A1A, texto branco, dados da empresa
- Max-width: 600px, centralizado, totalmente responsivo com media queries
- TODOS os estilos inline (não use <style> externo — clientes de email removem)
- Preheader text como <div> oculto antes do <body>

Formato de saída obrigatório (3 linhas separadas por "|||"):
ASSUNTO: [linha de assunto, máx 60 chars, sem emoji]|||PREVIEW: [texto preview, máx 90 chars]|||HTML: [HTML completo do email]

Retorne APENAS esses dados, sem explicações, sem markdown extra.`;

function buildEmailPrompt(campanha: Record<string, unknown>, briefingContent: string): string {
  return `Com base no briefing desta campanha da Fast PDR Tools:

${briefingContent}

---
Dados da campanha:
- Nome: ${campanha.nome}
- Produto: ${campanha.produto_destaque}
- URL: ${campanha.url_produto ?? 'https://www.fastpdrtools.com.br'}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'não informado'}
- Desconto Cartão: ${campanha.desconto_cartao ? `${campanha.desconto_cartao}%` : 'não informado'}
- Parcelamento: ${campanha.parcelamento ?? 'não informado'}
- Tom: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? 'não informado'}
- Público: ${Array.isArray(campanha.publico) ? (campanha.publico as string[]).join(', ') : ''}

Gere o email marketing completo seguindo o formato obrigatório.`;
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

  await logAgente(campanhaId, 'email', 'iniciado', 'Gerando email marketing via Claude');

  // Registra output com status 'gerando' para o Realtime do frontend
  const { data: outputRow } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'email', status: 'gerando' })
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

    // 2. Busca conteúdo do briefing para contexto
    const { data: briefingOutput } = await supabaseAdmin
      .from('campanha_outputs')
      .select('conteudo')
      .eq('campanha_id', campanhaId)
      .eq('tipo', 'briefing')
      .single();

    const briefingContent = briefingOutput?.conteudo ?? 'Briefing não disponível';

    // 3. Gera email via Claude
    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildEmailPrompt(campanha as Record<string, unknown>, briefingContent),
      3500
    );

    // 4. Extrai assunto, preview e HTML da resposta
    const parts = rawResponse.split('|||');
    const assunto = parts[0]?.replace(/^ASSUNTO:\s*/i, '').trim() ?? '';
    const preview = parts[1]?.replace(/^PREVIEW:\s*/i, '').trim() ?? '';
    const html = parts[2]?.replace(/^HTML:\s*/i, '').trim() ?? rawResponse;

    // Conteúdo final: cabeçalho com assunto/preview + HTML
    const conteudo = `ASSUNTO: ${assunto}\nPREVIEW: ${preview}\n\n${html}`;

    // 5. Cria doc no ClickUp com o HTML
    const doc = await createDoc(`Email — ${campanha.nome}`, conteudo);

    // 6. Atualiza output no Supabase
    await supabaseAdmin
      .from('campanha_outputs')
      .update({
        conteudo,
        clickup_doc_id: doc.id,
        status: 'pronto',
      })
      .eq('id', outputRow!.id);

    // 7. Atualiza task no ClickUp para "in review"
    if (taskId) {
      await updateTask(taskId, { status: 'in review' }).catch((e) =>
        console.warn('[email] falha ao atualizar task:', e.message)
      );
    }

    await logAgente(campanhaId, 'email', 'concluido', `Doc: ${doc.id}`);
    return NextResponse.json({ ok: true, docId: doc.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[email] erro:', msg);
    await logAgente(campanhaId, 'email', 'erro', msg);

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
