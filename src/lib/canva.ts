// Wrapper da Canva Connect API
// Nota: Canva Connect API está em beta restrito.
// Verificar acesso antes de usar: https://www.canva.com/developers/

const BASE = 'https://api.canva.com/rest/v1';

async function canvaFetch<T>(path: string, options: RequestInit | undefined, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Canva ${path} → ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// Faz upload de uma imagem a partir de uma URL pública
// Retorna o asset_id para uso no createDesignFromTemplate
export async function uploadImageFromUrl(
  imageUrl: string,
  nome: string,
  token: string
): Promise<{ asset_id: string }> {
  // 1. Baixa a imagem como buffer
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Briefly/1.0 (marketing automation)' },
  });
  if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imageUrl}`);

  const buffer = await imgRes.arrayBuffer();

  // Canva Connect API v1: Content-Type = octet-stream, nome em JSON no header
  const metadata = JSON.stringify({ name_base64: Buffer.from(nome, 'utf8').toString('base64') });

  const uploadRes = await fetch(`${BASE}/asset-uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': metadata,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Canva /asset-uploads → ${uploadRes.status}: ${errBody}`);
  }

  const uploadJob = await uploadRes.json() as {
    job: { id: string; status: string; asset?: { id: string } };
  };

  // 4. Aguarda conclusão do job (polling simples)
  let attempts = 0;
  while (attempts < 10) {
    const status = await canvaFetch<{
      job: { id: string; status: string; asset?: { id: string } };
    }>(`/asset-uploads/${uploadJob.job.id}`, undefined, token);

    if (status.job.status === 'success' && status.job.asset?.id) {
      return { asset_id: status.job.asset.id };
    }
    if (status.job.status === 'failed') {
      throw new Error('Upload de imagem para Canva falhou');
    }

    await new Promise((r) => setTimeout(r, 2000));
    attempts++;
  }

  throw new Error('Timeout aguardando upload no Canva');
}

type DesignResponse = {
  design: {
    id: string;
    title: string;
    urls: { view_url: string; edit_url: string };
  };
};

// Cria um design a partir de um brand template (requer Canva Teams)
// Se templateId estiver vazio, cria design em branco com preset de dimensões
export async function createDesignFromTemplate(
  templateId: string,
  assetId: string,
  titulo: string,
  token: string
): Promise<{ design_id: string; view_url: string; edit_url: string }> {
  if (templateId) {
    const design = await canvaFetch<DesignResponse>('/designs', {
      method: 'POST',
      body: JSON.stringify({
        title: titulo,
        brand_template_id: templateId,
        data: { product_image: { type: 'image', asset_id: assetId } },
      }),
    }, token);
    return {
      design_id: design.design.id,
      view_url: design.design.urls.view_url,
      edit_url: design.design.urls.edit_url,
    };
  }

  // Fallback: cria design em branco com dimensões customizadas
  // Feed=1080x1080, Story=1080x1920
  const isFeed = titulo.toLowerCase().includes('feed');
  const dimensions = isFeed
    ? { width: 1080, height: 1350 }   // Instagram Feed portrait
    : { width: 1080, height: 1920 };  // Instagram Story

  const design = await canvaFetch<DesignResponse>('/designs', {
    method: 'POST',
    body: JSON.stringify({ title: titulo, design_type: { type: 'custom', ...dimensions } }),
  }, token);

  return {
    design_id: design.design.id,
    view_url: design.design.urls.view_url,
    edit_url: design.design.urls.edit_url,
  };
}
