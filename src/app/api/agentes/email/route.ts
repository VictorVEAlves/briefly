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
import { buildUtmUrl, campaignToSlug } from '@/lib/utm';
import { FAST_BRAND_CONTEXT } from '@/lib/brand-context';

const SYSTEM_PROMPT = `Voce e o copywriter de email marketing da Fast PDR Tools. Voce recebe um briefing estrategico e gera o email completo.

${FAST_BRAND_CONTEXT}

## Seu papel

Transformar o briefing em UM email de marketing que converte. Voce nao inventa estrategia — o briefing ja definiu o angulo, o CTA, o desconto. Seu trabalho e executar com copy excelente.

## Principios de copy (seguir SEMPRE)

1. ASSUNTO: Claro > criativo. 40-60 chars. Sem emoji. Formatos que convertem:
   - Pergunta: "Seu kit esta pronto pro granizo?"
   - Beneficio direto: "18% OFF no PIX — so ate sexta"
   - Nome + acao: "Parceiro, seu desconto expira amanha"
   - Numero + resultado: "3 ferramentas que rendem o dobro no granizo"

2. PREVIEW TEXT: Complementa o assunto, NUNCA repete. 80-120 chars. Gera curiosidade ou completa o raciocinio.

3. ESTRUTURA DO EMAIL:
   - Hook (1a frase prende — dor, oportunidade ou novidade)
   - Contexto (por que isso importa agora)
   - Valor (o que o profissional ganha)
   - Oferta (desconto, prazo, mecanica)
   - CTA unico e claro (botao)
   - Fechamento humano (assinatura da Fast, sem "atenciosamente")

4. FORMATACAO:
   - Paragrafos de 1-3 frases. Muito espaco em branco.
   - Bullets para escaneabilidade quando listar beneficios.
   - UM botao de CTA principal. Pode repetir o link como texto no final.
   - Mobile-first: tudo deve funcionar em 320px de largura.

5. ESPECIFICIDADE:
   - "18% OFF no PIX = economia de R$ 630 no Kit Granizo Pro de R$ 3.500"
   - NUNCA: "grande desconto", "oferta imperdivel", "nao perca"
   - Calcule a economia real quando houver dados.

## Template HTML base

Use SEMPRE esta estrutura:
- DOCTYPE html com lang="pt-BR"
- Meta viewport no head
- Body: background #f4f4f4, margin 0, padding 0
- Div oculta com preheader text (display:none; max-height:0; overflow:hidden)
- Tabela centralizadora 100% width
- Tabela de conteudo max-width 600px:
  - HEADER: fundo #CC0000, texto "Fast PDR Tools" branco, 24px bold, padding 20px, text-align center
  - BODY: fundo branco, padding 32px, font-family Arial sans-serif, cor #1A1A1A
  - CTA BUTTON: fundo #CC0000, texto branco, padding 14px 32px, border-radius 4px, text-decoration none, font-weight bold, display inline-block
  - FOOTER: fundo #1A1A1A, texto #ffffff, padding 20px, font-size 12px, text-align center com "Fast PDR Tools — Curitiba, PR | fastpdrtools.com.br | Desde 2008"
- Todos os estilos inline

## Formato de saida OBRIGATORIO

ASSUNTO: [texto do assunto, max 60 chars]|||PREVIEW: [texto do preview, max 120 chars]|||HTML: [codigo HTML completo do email]

Retorne APENAS os dados no formato especificado, sem explicacoes.`;

function buildEmailPrompt(campanha: Record<string, unknown>, briefingContent: string, emailUrl: string): string {
  return `BRIEFING ESTRATEGICO DA CAMPANHA (use como base para TUDO):

${briefingContent}

---

DADOS OPERACIONAIS:
- Nome: ${campanha.nome}
- Produto: ${campanha.produto_destaque}
- URL com UTM: ${emailUrl}
- Desconto PIX: ${campanha.desconto_pix ? `${campanha.desconto_pix}%` : 'nao informado'}
- Desconto Cartao: ${campanha.desconto_cartao ? `${campanha.desconto_cartao}%` : 'nao informado'}
- Parcelamento: ${campanha.parcelamento ?? 'nao informado'}
- Tom definido no briefing: ${campanha.tom}
- Mensagem central: ${campanha.mensagem_central ?? 'extrair do briefing'}

INSTRUCOES:
1. Leia o briefing INTEIRO antes de escrever qualquer coisa.
2. Extraia o angulo de comunicacao da secao 7 (Estrategia por Canal > Email).
3. Use o CTA exato da secao 8.
4. Use os diferenciais da secao 9.
5. Calcule a economia real se houver dados de preco e desconto.
6. Gere o email no formato obrigatorio (ASSUNTO|||PREVIEW|||HTML).`;
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

    const baseUrl = (campanha.url_produto as string | null) ?? 'https://www.fastpdrtools.com.br';
    const emailUrl = buildUtmUrl(baseUrl, 'email', campaignToSlug(campanha.nome as string));

    const rawResponse = await generateText(
      SYSTEM_PROMPT,
      buildEmailPrompt(campanha as Record<string, unknown>, briefingContent, emailUrl),
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
