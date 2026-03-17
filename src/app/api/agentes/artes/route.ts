// Sub-agent for Canva art generation.
// 1. Extract the product image from campanha.url_produto
// 2. Upload the image to Canva
// 3. Create feed and story designs from brand templates
// 4. Save the design links in campanha_outputs
// 5. Create a ClickUp doc with the generated links

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImageFromUrl, createDesignFromTemplate } from '@/lib/canva';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, setAgentStatus, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

function resolveAssetUrl(candidate: string, baseUrl: string): string {
  return new URL(candidate.replace(/\\/g, ''), baseUrl).toString();
}

function buildTaskDescription(docId: string, docTitle: string, feedUrl: string, storyUrl: string): string {
  return [
    'Conteudo gerado automaticamente pelo agente de artes do Briefly.',
    '',
    `Doc ClickUp: ${docTitle}`,
    `Doc ID: ${docId}`,
    '',
    `Feed: ${feedUrl}`,
    `Story: ${storyUrl}`,
  ].join('\n');
}

async function scrapeProductImage(urlPagina: string): Promise<string> {
  const res = await fetch(urlPagina, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Briefly/1.0; marketing automation)',
      Accept: 'text/html',
    },
  });

  if (!res.ok) throw new Error(`Falha ao acessar pagina do produto: ${res.status}`);

  const html = await res.text();
  const pageUrl = res.url || urlPagina;

  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return resolveAssetUrl(ogMatch[1], pageUrl);

  const cacheMatch = html.match(
    /(?:https?:\/\/[^"' ]+\/)?image\/cache\/catalog\/produtos\/[^"']+550x550\.jpg/
  );
  if (cacheMatch?.[0]) return resolveAssetUrl(cacheMatch[0], pageUrl);

  const shopifyMatch = html.match(/"featured_image":"([^"]+)"/);
  if (shopifyMatch?.[1]) return resolveAssetUrl(shopifyMatch[1], pageUrl);

  throw new Error('Nao foi possivel extrair a imagem do produto da pagina');
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

  await logAgente(campanhaId, 'artes', 'iniciado', 'Criando artes no Canva');

  const { data: feedOutput } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'arte_feed', status: 'gerando' })
    .select()
    .single();

  const { data: storyOutput } = await supabaseAdmin
    .from('campanha_outputs')
    .insert({ campanha_id: campanhaId, tipo: 'arte_story', status: 'gerando' })
    .select()
    .single();

  try {
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha nao encontrada');

    await setAgentStatus('canva', 'working', `Artes — ${campanha.nome}`, campanhaId);

    if (!campanha.url_produto) {
      throw new Error('URL do produto nao informada - nao e possivel extrair a imagem');
    }

    const imageUrl = await scrapeProductImage(campanha.url_produto);
    console.log('[artes] imagem do produto:', imageUrl);

    const { asset_id } = await uploadImageFromUrl(imageUrl, campanha.produto_destaque);
    console.log('[artes] asset Canva:', asset_id);

    const feed = await createDesignFromTemplate(
      process.env.CANVA_BRAND_TEMPLATE_FEED_ID!,
      asset_id,
      `Feed - ${campanha.nome}`
    );
    console.log('[artes] design Feed:', feed.view_url);

    const story = await createDesignFromTemplate(
      process.env.CANVA_BRAND_TEMPLATE_STORY_ID!,
      asset_id,
      `Story - ${campanha.nome}`
    );
    console.log('[artes] design Story:', story.view_url);

    const docContent =
      `# Artes - ${campanha.nome}\n\n` +
      `## Instagram Feed (1080x1080)\n[Abrir no Canva](${feed.view_url})\n\n` +
      `## Instagram Stories (1080x1920)\n[Abrir no Canva](${story.view_url})`;
    const doc = await createDoc(
      `Artes - ${campanha.nome}`,
      docContent,
      campanha.clickup_list_id ? { id: campanha.clickup_list_id, type: 6 } : undefined
    );

    await supabaseAdmin
      .from('campanha_outputs')
      .update({ url_canva: feed.view_url, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', feedOutput!.id);

    await supabaseAdmin
      .from('campanha_outputs')
      .update({ url_canva: story.view_url, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', storyOutput!.id);

    if (taskId) {
      await updateTask(taskId, {
        status: 'em revisão',
        description: buildTaskDescription(doc.id, doc.title, feed.view_url, story.view_url),
      }).catch((e) => console.warn('[artes] falha ao atualizar task:', e.message));
    }

    await setAgentStatus('canva', 'idle', null, null);
    await logAgente(campanhaId, 'artes', 'concluido', `Feed: ${feed.design_id} | Story: ${story.design_id}`);
    return NextResponse.json({ ok: true, feed: feed.view_url, story: story.view_url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[artes] erro:', msg);
    await setAgentStatus('canva', 'error', `Erro: ${msg}`, campanhaId);
    await logAgente(campanhaId, 'artes', 'erro', msg);

    for (const row of [feedOutput, storyOutput]) {
      if (row?.id) {
        await supabaseAdmin
          .from('campanha_outputs')
          .update({ status: 'erro' })
          .eq('id', row.id);
      }
    }

    if (taskId) {
      await updateTask(taskId, { status: 'bloqueado' }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
