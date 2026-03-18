// Sub-agent for Canva art generation.
// 1. Extract the product image from campanha.url_produto
// 2. Upload the image to Canva
// 3. Create feed and/or story designs from brand templates
// 4. Save the design links in campanha_outputs
// 5. Create a ClickUp doc with the generated links

export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImageFromUrl, createDesignFromTemplate } from '@/lib/canva';
import { getCanvaAccessToken } from '@/lib/canva/getCanvaAccessToken';
import { createDoc, updateTask } from '@/lib/clickup';
import {
  logAgente,
  setAgentStatus,
  validateInternalSecret,
  unauthorizedResponse,
} from '@/lib/agente-utils';
import type { OutputTipo } from '@/types/campanha';

function resolveAssetUrl(candidate: string, baseUrl: string): string {
  return new URL(candidate.replace(/\\/g, ''), baseUrl).toString();
}

function buildTaskDescription(
  docId: string,
  docTitle: string,
  designs: Partial<Record<OutputTipo, { view_url: string; edit_url: string }>>
): string {
  const lines = [
    'Conteudo gerado automaticamente pelo agente de artes do Briefly.',
    '',
    `Doc ClickUp: ${docTitle}`,
    `Doc ID: ${docId}`,
  ];

  if (designs.arte_feed) {
    lines.push(
      '',
      '--- FEED (1080x1080) ---',
      `Visualizar: ${designs.arte_feed.view_url}`,
      `Editar no Canva: ${designs.arte_feed.edit_url}`
    );
  }

  if (designs.arte_story) {
    lines.push(
      '',
      '--- STORY (1080x1920) ---',
      `Visualizar: ${designs.arte_story.view_url}`,
      `Editar no Canva: ${designs.arte_story.edit_url}`
    );
  }

  return lines.join('\n');
}

function resolveTargets(
  canais: string[],
  requestedTargets?: OutputTipo[]
): OutputTipo[] {
  if (Array.isArray(requestedTargets) && requestedTargets.length > 0) {
    return requestedTargets.filter(
      (target): target is OutputTipo =>
        target === 'arte_feed' || target === 'arte_story'
    );
  }

  const targets: OutputTipo[] = [];
  if (canais.includes('instagram_feed')) targets.push('arte_feed');
  if (canais.includes('instagram_stories')) targets.push('arte_story');
  return targets;
}

async function fetchHtml(url: string): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Briefly/1.0; marketing automation)',
    Accept: 'text/html',
  };
  try {
    const res = await fetch(url, { headers });
    return res;
  } catch {
    const fallback = url.replace(/^https:\/\//, 'http://');
    if (fallback !== url) return fetch(fallback, { headers });
    throw new Error(`Falha de rede ao acessar: ${url}`);
  }
}

async function scrapeProductImage(urlPagina: string): Promise<string> {
  const res = await fetchHtml(urlPagina);

  if (!res.ok) throw new Error(`Falha ao acessar pagina do produto: ${res.status}`);

  const html = await res.text();
  const pageUrl = res.url || urlPagina;

  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
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
  let taskId: string | undefined;       // legado — atualiza ambos
  let feedTaskId: string | undefined;   // task específica do feed
  let storyTaskId: string | undefined;  // task específica do story
  let requestedTargets: OutputTipo[] | undefined;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    taskId = body.taskId;
    feedTaskId = body.feedTaskId;
    storyTaskId = body.storyTaskId;
    requestedTargets = body.targets;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  await logAgente(campanhaId, 'artes', 'iniciado', 'Criando artes no Canva');

  let feedOutput: { id: string } | null = null;
  let storyOutput: { id: string } | null = null;

  try {
    const { data: campanha, error: campError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single();

    if (campError || !campanha) throw new Error('Campanha nao encontrada');

    const targets = resolveTargets(
      Array.isArray(campanha.canais) ? campanha.canais : [],
      requestedTargets
    );
    if (targets.length === 0) {
      throw new Error('Nenhum output de arte selecionado para essa campanha');
    }

    if (targets.includes('arte_feed')) {
      const { data } = await supabaseAdmin
        .from('campanha_outputs')
        .insert({ campanha_id: campanhaId, tipo: 'arte_feed', status: 'gerando' })
        .select()
        .single();
      feedOutput = data;
    }

    if (targets.includes('arte_story')) {
      const { data } = await supabaseAdmin
        .from('campanha_outputs')
        .insert({ campanha_id: campanhaId, tipo: 'arte_story', status: 'gerando' })
        .select()
        .single();
      storyOutput = data;
    }

    const canvaToken = await getCanvaAccessToken();
    if (!canvaToken) {
      throw new Error('Canva nao autenticado. Acesse /api/canva/authorize para conectar.');
    }

    const FEED_ID = process.env.CANVA_BRAND_TEMPLATE_FEED_ID ?? '';
    const STORY_ID = process.env.CANVA_BRAND_TEMPLATE_STORY_ID ?? '';

    await setAgentStatus('canva', 'working', `Artes - ${campanha.nome}`, campanhaId);

    // Upload da imagem do produto — opcional, continua sem ela se url_produto não informada
    let asset_id: string | null = null;
    if (campanha.url_produto) {
      try {
        const imageUrl = await scrapeProductImage(campanha.url_produto);
        console.log('[artes] imagem do produto:', imageUrl);
        const uploaded = await uploadImageFromUrl(imageUrl, campanha.produto_destaque, canvaToken);
        asset_id = uploaded.asset_id;
        console.log('[artes] asset Canva:', asset_id);
      } catch (imgErr) {
        const imgMsg = imgErr instanceof Error ? imgErr.message : 'erro desconhecido';
        console.warn('[artes] nao foi possivel fazer upload da imagem, continuando sem ela:', imgMsg);
        await logAgente(campanhaId, 'artes', 'iniciado', `Aviso: imagem nao carregada — ${imgMsg}`);
      }
    } else {
      console.warn('[artes] url_produto nao informada — designs criados sem imagem do produto');
    }

    const designs: Partial<
      Record<OutputTipo, { design_id: string; view_url: string; edit_url: string }>
    > = {};

    if (targets.includes('arte_feed')) {
      const feed = await createDesignFromTemplate(
        FEED_ID,
        asset_id,
        `Feed - ${campanha.nome}`,
        canvaToken
      );
      designs.arte_feed = feed;
      console.log('[artes] design Feed:', feed.view_url);
    }

    if (targets.includes('arte_story')) {
      const story = await createDesignFromTemplate(
        STORY_ID,
        asset_id,
        `Story - ${campanha.nome}`,
        canvaToken
      );
      designs.arte_story = story;
      console.log('[artes] design Story:', story.view_url);
    }

    const docSections = [`# Artes - ${campanha.nome}`];
    if (designs.arte_feed) {
      docSections.push(
        '',
        '## Instagram Feed (1080x1080)',
        `- [Visualizar](${designs.arte_feed.view_url})`,
        `- [Editar no Canva](${designs.arte_feed.edit_url})`
      );
    }
    if (designs.arte_story) {
      docSections.push(
        '',
        '## Instagram Stories (1080x1920)',
        `- [Visualizar](${designs.arte_story.view_url})`,
        `- [Editar no Canva](${designs.arte_story.edit_url})`
      );
    }
    const docContent = docSections.join('\n');

    const doc = await createDoc(
      `Artes - ${campanha.nome}`,
      docContent,
      campanha.clickup_list_id ? { id: campanha.clickup_list_id, type: 6 } : undefined
    );

    if (feedOutput?.id && designs.arte_feed) {
      await supabaseAdmin
        .from('campanha_outputs')
        .update({
          url_canva: designs.arte_feed.edit_url,
          clickup_doc_id: doc.id,
          status: 'pronto',
        })
        .eq('id', feedOutput.id);
    }

    if (storyOutput?.id && designs.arte_story) {
      await supabaseAdmin
        .from('campanha_outputs')
        .update({
          url_canva: designs.arte_story.edit_url,
          clickup_doc_id: doc.id,
          status: 'pronto',
        })
        .eq('id', storyOutput.id);
    }

    // Atualiza as tasks do ClickUp com os links das artes
    const descricaoCompleta = buildTaskDescription(doc.id, doc.title, designs);

    // Task específica do Feed
    const resolvedFeedTaskId = feedTaskId ?? (designs.arte_feed && !storyTaskId ? taskId : undefined);
    if (resolvedFeedTaskId && designs.arte_feed) {
      await updateTask(resolvedFeedTaskId, {
        status: 'em revisão',
        description:
          `Arte gerada automaticamente pelo agente do Briefly.\n\n` +
          `--- FEED (1080x1350) ---\n` +
          `Visualizar: ${designs.arte_feed.view_url}\n` +
          `Editar no Canva: ${designs.arte_feed.edit_url}\n\n` +
          `Doc: ${doc.title} (ID: ${doc.id})`,
      }).catch((e) => console.warn('[artes] falha ao atualizar feedTask:', e.message));
    }

    // Task específica do Story
    const resolvedStoryTaskId = storyTaskId ?? (designs.arte_story && !feedTaskId ? taskId : undefined);
    if (resolvedStoryTaskId && designs.arte_story) {
      await updateTask(resolvedStoryTaskId, {
        status: 'em revisão',
        description:
          `Arte gerada automaticamente pelo agente do Briefly.\n\n` +
          `--- STORY (1080x1920) ---\n` +
          `Visualizar: ${designs.arte_story.view_url}\n` +
          `Editar no Canva: ${designs.arte_story.edit_url}\n\n` +
          `Doc: ${doc.title} (ID: ${doc.id})`,
      }).catch((e) => console.warn('[artes] falha ao atualizar storyTask:', e.message));
    }

    // Legado: se só taskId foi passado (sem feedTaskId/storyTaskId), atualiza com descrição completa
    if (taskId && !feedTaskId && !storyTaskId) {
      await updateTask(taskId, {
        status: 'em revisão',
        description: descricaoCompleta,
      }).catch((e) => console.warn('[artes] falha ao atualizar task:', e.message));
    }

    await setAgentStatus('canva', 'idle', null, null);
    await logAgente(
      campanhaId,
      'artes',
      'concluido',
      Object.entries(designs)
        .map(([target, design]) => `${target}: ${design?.design_id ?? 'ok'}`)
        .join(' | ')
    );

    return NextResponse.json({
      ok: true,
      feed: designs.arte_feed?.edit_url,
      story: designs.arte_story?.edit_url,
    });
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

    for (const tid of [taskId, feedTaskId, storyTaskId]) {
      if (tid) await updateTask(tid, { status: 'bloqueado' }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
