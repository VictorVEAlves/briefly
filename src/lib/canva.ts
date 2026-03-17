// Wrapper da Canva Connect API
// Nota: Canva Connect API está em beta restrito.
// Verificar acesso antes de usar: https://www.canva.com/developers/

const BASE = 'https://api.canva.com/rest/v1';

async function canvaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.CANVA_API_KEY!}`,
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
  nome: string
): Promise<{ asset_id: string }> {
  // 1. Baixa a imagem como buffer
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Briefly/1.0 (marketing automation)' },
  });
  if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imageUrl}`);

  const buffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';

  // 2. Cria job de upload no Canva
  const uploadJob = await canvaFetch<{
    job: { id: string; status: string; asset?: { id: string } };
  }>('/asset-uploads', {
    method: 'POST',
    body: JSON.stringify({ name: nome, type: 'image' }),
  });

  // 3. Sobe o arquivo binário via PUT no job
  const uploadUrl = `${BASE}/asset-uploads/${uploadJob.job.id}`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.CANVA_API_KEY!}`,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Falha ao enviar imagem para Canva: ${uploadRes.status}`);
  }

  // 4. Aguarda conclusão do job (polling simples)
  let attempts = 0;
  while (attempts < 10) {
    const status = await canvaFetch<{
      job: { id: string; status: string; asset?: { id: string } };
    }>(`/asset-uploads/${uploadJob.job.id}`);

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

// Cria um design a partir de um brand template do Canva
// templateId: ID do template (Feed 1080x1080 ou Story 1080x1920)
// assetId: ID do asset da imagem do produto
export async function createDesignFromTemplate(
  templateId: string,
  assetId: string,
  titulo: string
): Promise<{ design_id: string; view_url: string }> {
  const design = await canvaFetch<{
    design: {
      id: string;
      title: string;
      urls: { view_url: string; edit_url: string };
    };
  }>('/designs', {
    method: 'POST',
    body: JSON.stringify({
      title: titulo,
      brand_template_id: templateId,
      data: {
        // Campo "product_image" deve existir no template Canva como data field
        product_image: {
          type: 'image',
          asset_id: assetId,
        },
      },
    }),
  });

  return {
    design_id: design.design.id,
    view_url: design.design.urls.view_url,
  };
}
