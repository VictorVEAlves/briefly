// Email marketing agent
// 1. Fetches briefing and campanha from Supabase
// 2. Claude generates the full HTML email
// 3. Saves the output in campanha_outputs
// 4. Creates a ClickUp doc with the generated email
// 5. Updates the ClickUp task with the complete email for direct use

export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, setAgentStatus, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

const SYSTEM_PROMPT = `Voce e um copywriter especializado em e-mail marketing para ferramentas automotivas no Brasil.
Escreve para a Fast PDR Tools, empresa de Curitiba que vende ferramentas PDR profissionais.

Regras de marca:
- Header: fundo vermelho #CC0000, texto "Fast PDR Tools" em branco, sem logo externo
- Corpo: fundo branco, texto #1A1A1A, font-family Arial, sans-serif
- CTA buttons: fundo #CC0000, texto branco, border-radius 4px
- Footer: fundo #1A1A1A, texto branco, dados da empresa
- Max-width: 600px, centralizado, totalmente responsivo com media queries
- Todos os estilos inline
- Preheader text como <div> oculto antes do <body>

Principios de copywriting de email:
- Assunto: claro > criativo. 40-60 chars. Formatos que funcionam: "Pergunta?", "Como [resultado] em [tempo]", "[Nome], [coisa] esta pronta", "[N] maneiras de [beneficio]"
- Preview text: complementa o assunto, nao repete. 90-130 chars. Complete o raciocinio ou gere curiosidade.
- Estrutura do email: Hook (primeira linha prende) -> Contexto (por que importa) -> Valor (conteudo util) -> CTA (o que fazer) -> Fechamento humano
- Paragrafos curtos: 1-3 frases. Espaco em branco. Bullets para escaneabilidade. Mobile-first.
- Um unico CTA principal por email. Texto do botao: Acao + o que recebe. Ex: "GARANTIR MEU KIT AGORA", "VER OFERTA COMPLETA"
- Especifico > vago: "18% OFF no PIX = economia de R$ 450 no kit de R$ 2.500" em vez de "grande desconto"
- Beneficios > features: "atende 3x mais clientes no pico do granizo" em vez de "kit completo"

Formato de saida obrigatorio (3 linhas separadas por "|||"):
ASSUNTO: [linha de assunto, max 60 chars, sem emoji]|||PREVIEW: [texto preview, max 90 chars]|||HTML: [HTML completo do email]

Retorne apenas esses dados, sem explicacoes e sem markdown extra.`;

function buildEmailPrompt(campanha: Record<string, unknown>, briefingContent: string): string {
  return `Com base no briefing desta campanha da Fast PDR Tools:

${briefingContent}

---
Dados da campanha:
- Nome: ${campanha.nome}
- Produto: ${campanha.produto_destaque}
- URL: ${campanha.url_produto ?? 'https://www.fastpdrtools.com.br'}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'nao informado'}
- Desconto Cartao: ${campanha.desconto_cartao ? `${campanha.desconto_cartao}%` : 'nao informado'}
- Parcelamento: ${campanha.parcelamento ?? 'nao informado'}
- Tom: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? 'nao informado'}
- Publico: ${Array.isArray(campanha.publico) ? (campanha.publico as string[]).join(', ') : ''}

Gere o email marketing completo seguindo o formato obrigatorio.`;
}

function buildTaskDescription(docId: string, docTitle: string, conteudo: string): string {
  const [assuntoLine = 'ASSUNTO: Nao informado', previewLine = 'PREVIEW: Nao informado', ...rest] =
    conteudo.split('\n');
  const html = rest.join('\n').trim();

  return [
    'Conteudo gerado automaticamente pelo agente de email do Briefly.',
    '',
    `Doc ClickUp: ${docTitle}`,
    `Doc ID: ${docId}`,
    '',
    assuntoLine,
    previewLine,
    '',
    'HTML COMPLETO:',
    '```html',
    html,
    '```',
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

  await logAgente(campanhaId, 'email', 'iniciado', 'Gerando email marketing via Claude');

  const { data: outputRow } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'email', status: 'gerando' })
    .select()
    .single();

  try {
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha nao encontrada');

    await setAgentStatus('email', 'working', `Email — ${campanha.nome}`, campanhaId);

    const { data: briefingOutput } = await supabaseAdmin
      .from('campanha_outputs')
      .select('conteudo')
      .eq('campanha_id', campanhaId)
      .eq('tipo', 'briefing')
      .single();

    const briefingContent = briefingOutput?.conteudo ?? 'Briefing nao disponivel';

    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildEmailPrompt(campanha as Record<string, unknown>, briefingContent),
      3500
    );

    // Split apenas nos 2 primeiros '|||' para não quebrar se o HTML contiver '|||'
    const firstSep = rawResponse.indexOf('|||');
    const secondSep = firstSep >= 0 ? rawResponse.indexOf('|||', firstSep + 3) : -1;
    const assunto = (firstSep >= 0 ? rawResponse.slice(0, firstSep) : rawResponse)
      .replace(/^ASSUNTO:\s*/i, '').trim();
    const preview = (firstSep >= 0 && secondSep >= 0
      ? rawResponse.slice(firstSep + 3, secondSep)
      : ''
    ).replace(/^PREVIEW:\s*/i, '').trim();
    const html = (secondSep >= 0
      ? rawResponse.slice(secondSep + 3)
      : rawResponse
    ).replace(/^HTML:\s*/i, '').trim();
    const conteudo = `ASSUNTO: ${assunto}\nPREVIEW: ${preview}\n\n${html}`;

    const doc = await createDoc(
      `Email - ${campanha.nome}`,
      conteudo,
      campanha.clickup_list_id ? { id: campanha.clickup_list_id, type: 6 } : undefined
    );

    await supabaseAdmin
      .from('campanha_outputs')
      .update({
        conteudo,
        clickup_doc_id: doc.id,
        status: 'pronto',
      })
      .eq('id', outputRow!.id);

    if (taskId) {
      await updateTask(taskId, {
        status: 'em revisão',
        description: buildTaskDescription(doc.id, doc.title, conteudo),
      }).catch((e) => console.warn('[email] falha ao atualizar task:', e.message));
    }

    await setAgentStatus('email', 'idle', null, null);
    await logAgente(campanhaId, 'email', 'concluido', `Doc: ${doc.id}`);
    return NextResponse.json({ ok: true, docId: doc.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[email] erro:', msg);
    await setAgentStatus('email', 'error', `Erro: ${msg}`, campanhaId);
    await logAgente(campanhaId, 'email', 'erro', msg);

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
