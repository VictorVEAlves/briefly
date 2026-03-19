/**
 * UTM link generation for campaign outputs.
 * Every channel gets a deterministic, trackable URL so GA4 can attribute
 * sessions back to specific campaigns.
 */

export type UtmChannel = 'email' | 'whatsapp_vip' | 'whatsapp_tallos' | 'whatsapp_base' | 'instagram_feed' | 'instagram_story';

type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
};

const CHANNEL_PARAMS: Record<UtmChannel, Omit<UtmParams, 'utm_campaign'>> = {
  email: {
    utm_source: 'email',
    utm_medium: 'email',
    utm_content: 'email_marketing',
  },
  whatsapp_vip: {
    utm_source: 'whatsapp',
    utm_medium: 'mensagem',
    utm_content: 'grupo_vip',
  },
  whatsapp_tallos: {
    utm_source: 'whatsapp',
    utm_medium: 'mensagem',
    utm_content: 'tallos',
  },
  whatsapp_base: {
    utm_source: 'whatsapp',
    utm_medium: 'mensagem',
    utm_content: 'base_geral',
  },
  instagram_feed: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_content: 'feed',
  },
  instagram_story: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_content: 'story',
  },
};

/**
 * Converts a campaign name into a clean UTM slug.
 * "Black Friday 2024" → "black-friday-2024"
 * This value must be consistent — it's what GA4 receives as utm_campaign
 * and what analytics.ts queries via sessionCampaignName.
 */
export function campaignToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Appends UTM params to a product URL for a given channel.
 * Falls back to the base URL unchanged if it's not a valid URL.
 */
export function buildUtmUrl(baseUrl: string, channel: UtmChannel, campaignSlug: string): string {
  try {
    const url = new URL(baseUrl);
    const params = CHANNEL_PARAMS[channel];
    url.searchParams.set('utm_source', params.utm_source);
    url.searchParams.set('utm_medium', params.utm_medium);
    url.searchParams.set('utm_campaign', campaignSlug);
    url.searchParams.set('utm_content', params.utm_content);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Generates all UTM links for a campaign given its active channels.
 * Returns a map of channel → tagged URL.
 */
export function buildCampaignUtmLinks(
  baseUrl: string,
  campaignName: string,
  canais: string[]
): Partial<Record<UtmChannel, string>> {
  const slug = campaignToSlug(campaignName);
  const links: Partial<Record<UtmChannel, string>> = {};

  if (canais.includes('email')) {
    links.email = buildUtmUrl(baseUrl, 'email', slug);
  }
  if (canais.includes('whatsapp')) {
    links.whatsapp_vip = buildUtmUrl(baseUrl, 'whatsapp_vip', slug);
    links.whatsapp_tallos = buildUtmUrl(baseUrl, 'whatsapp_tallos', slug);
    links.whatsapp_base = buildUtmUrl(baseUrl, 'whatsapp_base', slug);
  }
  if (canais.includes('instagram_feed')) {
    links.instagram_feed = buildUtmUrl(baseUrl, 'instagram_feed', slug);
  }
  if (canais.includes('instagram_stories') || canais.includes('instagram_story')) {
    links.instagram_story = buildUtmUrl(baseUrl, 'instagram_story', slug);
  }

  return links;
}

/**
 * Renders the UTM links block for inclusion in briefing documents.
 */
export function renderUtmLinksMarkdown(
  baseUrl: string,
  campaignName: string,
  canais: string[]
): string {
  const slug = campaignToSlug(campaignName);
  const links = buildCampaignUtmLinks(baseUrl, campaignName, canais);

  const LABELS: Record<UtmChannel, string> = {
    email: 'Email marketing',
    whatsapp_vip: 'WhatsApp — Grupo VIP',
    whatsapp_tallos: 'WhatsApp — Tallos',
    whatsapp_base: 'WhatsApp — Base Geral',
    instagram_feed: 'Instagram Feed',
    instagram_story: 'Instagram Story',
  };

  const rows = (Object.entries(links) as [UtmChannel, string][])
    .map(([channel, url]) => `| ${LABELS[channel]} | \`${url}\` |`)
    .join('\n');

  if (!rows) return '';

  return [
    '',
    '---',
    '',
    '## 11. Links UTM para Rastreamento',
    '',
    `**utm_campaign:** \`${slug}\``,
    '',
    '| Canal | URL rastreada |',
    '|-------|---------------|',
    rows,
    '',
    '> Estes links já estão prontos para uso. Cole-os diretamente nos materiais de cada canal.',
    '> O GA4 atribuirá as sessões à campanha automaticamente via `utm_campaign`.',
  ].join('\n');
}
