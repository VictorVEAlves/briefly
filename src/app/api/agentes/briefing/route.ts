// Briefing agent
// 1. Fetches campanha from Supabase
// 2. Generates the campaign briefing with Claude
// 3. Creates the ClickUp list inside the Campanhas folder
// 4. Creates the briefing doc in the same ClickUp list
// 5. Persists ClickUp IDs on campanha
// 6. Saves the output in campanha_outputs

export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/claude';
import { createList, createDoc } from '@/lib/clickup';
import { logAgente, setAgentStatus, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';
import { renderUtmLinksMarkdown } from '@/lib/utm';
import { FAST_BRAND_CONTEXT } from '@/lib/brand-context';

const SYSTEM_PROMPT = `Voce e o estrategista de marketing da Fast PDR Tools. Seu trabalho e transformar os dados de uma campanha em um briefing completo que vai guiar TODOS os outros agentes (email, WhatsApp, artes).

${FAST_BRAND_CONTEXT}

## Seu papel

Voce nao gera textos de marketing — voce cria a ESTRATEGIA que guia quem gera. O briefing precisa ser tao claro e especifico que qualquer pessoa (ou agente de IA) consiga criar o email, o WhatsApp e a arte sem precisar inventar nada.

## Regras de escrita

- Portugues do Brasil, sem acentos nos titulos de secao (compatibilidade Markdown)
- Seja ESPECIFICO: numeros, prazos, percentuais, calculos de economia. "18% OFF no PIX em um kit de R$ 3.500 = economia de R$ 630" e melhor que "grande desconto".
- Cada secao deve responder uma PERGUNTA DE NEGOCIO, nao preencher espaco.
- O tom do briefing e interno/estrategico — e um documento de trabalho, nao marketing final.
- Maximo de clareza: se o email agent ler so a secao 8 (CTA), ele precisa saber exatamente o que escrever.

## Estrutura obrigatoria do output

# Briefing Estrategico: [Nome da Campanha]

## 1. Visao geral
Uma frase que resume a campanha inteira. O que estamos vendendo, pra quem, por que agora.
Periodo exato. Contexto de mercado (ex: temporada de granizo, Black Friday, lancamento).

## 2. Objetivo e meta
O que queremos que aconteca? Vendas? Leads? Awareness?
Meta numerica se possivel. Ex: "Vender 30 unidades do Kit Granizo no periodo" ou "Gerar 200 cliques no link do produto".

## 3. Produto em destaque
Nome exato do produto. O que ele faz. Por que ele e relevante AGORA.
Faixa de preco. Diferenciais tecnicos que importam pro profissional.
O que o concorrente oferece de similar e por que a Fast e melhor.

## 4. Oferta e mecanica promocional
Desconto PIX: X% = economia de R$ Y no produto de R$ Z.
Desconto cartao: X%.
Parcelamento: ate Nx de R$ Y.
Validade exata da oferta.
Regras: cumulativo? frete incluso? estoque limitado?

## 5. Publico-alvo e angulos de comunicacao
Para cada segmento do publico, definir:
- Quem e (martelinheiro autonomo, tecnico de granizo, iniciante, revendedor)
- Qual a dor ou desejo principal
- Qual angulo de comunicacao funciona (escassez, economia, produtividade, status)

## 6. Tom, voz e diretrizes de linguagem
Tom exato para essa campanha. Palavras a usar. Palavras a evitar.
Nivel de urgencia. Nivel de exclusividade.
Exemplos de frases que funcionam vs frases proibidas.

## 7. Estrategia por canal
Para CADA canal selecionado:
- Email: qual o angulo do assunto? qual o hook? qual o CTA?
- WhatsApp: qual a diferenca entre grupo VIP, Tallos e base geral?
- Instagram Feed: qual a headline da arte? qual a imagem ideal?
- Instagram Stories: qual o formato? sequencia de stories?

## 8. CTA principal
O texto exato do CTA. Ex: "GARANTIR MEU KIT COM 18% OFF"
A URL de destino.
O senso de urgencia: por que agir agora?

## 9. Diferenciais competitivos a destacar
Top 3 diferenciais a usar nessa campanha especifica (nao generico — escolher os mais relevantes pro produto e momento).

## 10. Checklist de ativacao
Lista de tudo que precisa estar pronto antes do lancamento:
- [ ] Precos atualizados no site
- [ ] Email pronto e testado
- [ ] WhatsApp programado
- [ ] Artes aprovadas
- [ ] UTMs configuradas`;

function buildBriefingPrompt(campanha: Record<string, unknown>): string {
  const linhas = [
    `DADOS DA CAMPANHA:`,
    `- Nome: ${campanha.nome}`,
    `- Periodo: ${campanha.periodo_inicio} a ${campanha.periodo_fim}`,
    `- Produto em destaque: ${campanha.produto_destaque}`,
  ];

  if (campanha.url_produto) linhas.push(`- URL do produto: ${campanha.url_produto}`);

  if (campanha.desconto_pix) linhas.push(`- Desconto PIX: ${campanha.desconto_pix}%`);
  if (campanha.desconto_cartao) linhas.push(`- Desconto Cartao: ${campanha.desconto_cartao}%`);
  if (campanha.parcelamento) linhas.push(`- Parcelamento: ${campanha.parcelamento}`);

  if (Array.isArray(campanha.publico) && (campanha.publico as string[]).length > 0) {
    linhas.push(`- Publico-alvo: ${(campanha.publico as string[]).join(', ')}`);
  }
  if (Array.isArray(campanha.canais) && (campanha.canais as string[]).length > 0) {
    linhas.push(`- Canais: ${(campanha.canais as string[]).join(', ')}`);
  }
  if (campanha.tom) linhas.push(`- Tom: ${campanha.tom}`);
  if (campanha.mensagem_central) linhas.push(`- Mensagem central: ${campanha.mensagem_central}`);

  linhas.push('');
  linhas.push('Gere o briefing estrategico completo seguindo a estrutura obrigatoria definida no system prompt.');
  linhas.push('Seja especifico com numeros: calcule a economia real em reais quando houver dados de preco e desconto.');

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

    await setAgentStatus('briefing', 'working', `Briefing — ${campanha.nome}`, campanhaId);

    const generationStartedAt = Date.now();
    const rawBriefing = await generateText(
      SYSTEM_PROMPT,
      buildBriefingPrompt(campanha as Record<string, unknown>),
      4500
    );
    console.log('[briefing] Claude finalizou em ms:', Date.now() - generationStartedAt);

    const utmBlock = campanha.url_produto
      ? renderUtmLinksMarkdown(
          campanha.url_produto as string,
          campanha.nome as string,
          Array.isArray(campanha.canais) ? (campanha.canais as string[]) : []
        )
      : '';
    const briefingMarkdown = rawBriefing + utmBlock;

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

    await setAgentStatus('briefing', 'idle', null, null);
    await logAgente(campanhaId, 'briefing', 'concluido', `Lista: ${lista.id} | Doc: ${doc.id}`);

    return NextResponse.json({ ok: true, listId: lista.id, docId: doc.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[briefing] erro:', msg);
    await setAgentStatus('briefing', 'error', `Erro: ${msg}`, campanhaId);
    await logAgente(campanhaId, 'briefing', 'erro', msg);
    await supabaseAdmin
      .from('campanha_outputs')
      .upsert({ campanha_id: campanhaId, tipo: 'briefing', status: 'erro', conteudo: null })
      .eq('campanha_id', campanhaId);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
