// Sub-agente de Artes (Canva)
// 1. Extrai imagem do produto via scraping da url_produto
// 2. Faz upload da imagem no Canva
// 3. Cria design Feed (1080x1080) e Story (1080x1920) a partir de templates
// 4. Salva links dos designs em campanha_outputs
// 5. Cria doc no ClickUp com os links

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImageFromUrl, createDesignFromTemplate } from '@/lib/canva';
import { createDoc, updateTask } from '@/lib/clickup';
import { logAgente, validateInternalSecret, unauthorizedResponse } from '@/lib/agente-utils';

// Tenta extrair a URL da imagem do produto a partir da página HTML
async function scrapeProductImage(urlPagina: string): Promise<string> {
  const res = await fetch(urlPagina, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Briefly/1.0; marketing automation)',
      Accept: 'text/html',
    },
  });

  if (!res.ok) throw new Error(`Falha ao acessar página do produto: ${res.status}`);

  const html = await res.text();

  // Tentativa 1: og:image (padrão em Shopify e a maioria dos e-commerces)
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return ogMatch[1];

  // Tentativa 2: padrão de URL da Fast PDR Tools (cache de imagem Shopify/OpenCart)
  const cacheMatch = html.match(/image\/cache\/catalog\/produtos\/[^"']+550x550\.jpg/);
  if (cacheMatch) return `https://www.fastpdrtools.com.br/${cacheMatch[0]}`;

  // Tentativa 3: JSON de produto Shopify
  const shopifyMatch = html.match(/"featured_image":"([^"]+)"/);
  if (shopifyMatch) return shopifyMatch[1].replace(/\\/g, '');

  throw new Error('Não foi possível extrair a imagem do produto da página');
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

  await logAgente(campanhaId, 'artes', 'iniciado', 'Criando artes no Canva');

  // Registra outputs para Feed e Story como 'gerando'
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
    // 1. Busca campanha
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha não encontrada');

    if (!campanha.url_produto) {
      throw new Error('URL do produto não informada — não é possível extrair a imagem');
    }

    // 2. Extrai URL da imagem do produto
    const imageUrl = await scrapeProductImage(campanha.url_produto);
    console.log('[artes] imagem do produto:', imageUrl);

    // 3. Faz upload da imagem no Canva
    const { asset_id } = await uploadImageFromUrl(imageUrl, campanha.produto_destaque);
    console.log('[artes] asset Canva:', asset_id);

    // 4. Cria design Feed (1080x1080)
    const feed = await createDesignFromTemplate(
      process.env.CANVA_BRAND_TEMPLATE_FEED_ID!,
      asset_id,
      `Feed — ${campanha.nome}`
    );
    console.log('[artes] design Feed:', feed.view_url);

    // 5. Cria design Story (1080x1920)
    const story = await createDesignFromTemplate(
      process.env.CANVA_BRAND_TEMPLATE_STORY_ID!,
      asset_id,
      `Story — ${campanha.nome}`
    );
    console.log('[artes] design Story:', story.view_url);

    // 6. Cria doc no ClickUp com os links
    const docContent = `# Artes — ${campanha.nome}\n\n## Instagram Feed (1080×1080)\n[Abrir no Canva](${feed.view_url})\n\n## Instagram Stories (1080×1920)\n[Abrir no Canva](${story.view_url})`;
    const doc = await createDoc(`Artes — ${campanha.nome}`, docContent);

    // 7. Atualiza outputs
    await supabaseAdmin
      .from('campanha_outputs')
      .update({ url_canva: feed.view_url, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', feedOutput!.id);

    await supabaseAdmin
      .from('campanha_outputs')
      .update({ url_canva: story.view_url, clickup_doc_id: doc.id, status: 'pronto' })
      .eq('id', storyOutput!.id);

    // 8. Atualiza task
    if (taskId) {
      await updateTask(taskId, { status: 'in review' }).catch((e) =>
        console.warn('[artes] falha ao atualizar task:', e.message)
      );
    }

    await logAgente(campanhaId, 'artes', 'concluido', `Feed: ${feed.design_id} | Story: ${story.design_id}`);
    return NextResponse.json({ ok: true, feed: feed.view_url, story: story.view_url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[artes] erro:', msg);
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
      await updateTask(taskId, { status: 'blocked' }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
