import { JWT, OAuth2Client } from 'google-auth-library';

const GOOGLE_TOKEN_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';

type GaMatchType = 'EXACT' | 'CONTAINS';

type GaMetricValue = {
  value: string;
};

type GaRunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: GaMetricValue[];
  }>;
};

type SearchConsoleResponse = {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
};

export type Ga4CampaignMetrics = {
  sessions: number;
  revenue: number;
  conversions: number;
  conversionRate: number;
  matchedField: string | null;
  matchedValue: string | null;
  matchType: GaMatchType | null;
};

export type SearchConsoleKeywordRow = {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
};

export type SearchConsoleMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  keywords: SearchConsoleKeywordRow[];
};

export type CampaignAnalyticsSnapshot = {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  ga4: Ga4CampaignMetrics;
  gsc: SearchConsoleMetrics;
  searchConsoleSiteUrl: string;
};

export type SiteChannelRow = {
  channel: string;
  sessions: number;
  revenue: number;
  conversions: number;
};

export type SiteAnalyticsSnapshot = {
  period: { startDate: string; endDate: string; days: number };
  ga4: {
    sessions: number;
    activeUsers: number;
    revenue: number;
    conversions: number;
    conversionRate: number;
    avgOrderValue: number;
    prev: { sessions: number; activeUsers: number; revenue: number; conversions: number };
    topPages: Array<{ page: string; sessions: number }>;
    topChannels: SiteChannelRow[];
  };
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
    keywords: SearchConsoleKeywordRow[];
    prev: { clicks: number; impressions: number; ctr: number; averagePosition: number };
  };
};

export function hasAnalyticsConfig() {
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_GA4_PROPERTY_ID
  );
  const hasOAuth = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_GA4_PROPERTY_ID
  );
  return hasServiceAccount || hasOAuth;
}

export function resolveSearchConsoleSiteUrl(productUrl?: string | null) {
  if (process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL) {
    return process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  }

  if (!productUrl) {
    throw new Error(
      'GOOGLE_SEARCH_CONSOLE_SITE_URL nao configurada e a campanha nao possui url_produto para derivar a propriedade'
    );
  }

  const origin = new URL(productUrl).origin;
  return `${origin}/`;
}

export function resolveAnalyticsDateRange(periodoInicio: string, periodoFim: string) {
  const startDate = toIsoDate(periodoInicio);
  const campaignEndDate = toIsoDate(periodoFim);
  const today = toIsoDate(new Date().toISOString());
  const endDate = campaignEndDate < today ? campaignEndDate : today;

  return {
    startDate,
    endDate,
    hasStarted: startDate <= today,
  };
}

export async function fetchCampaignAnalytics(args: {
  campaignName: string;
  produtoDestaque: string;
  productUrl?: string | null;
  periodoInicio: string;
  periodoFim: string;
}): Promise<CampaignAnalyticsSnapshot> {
  if (!hasAnalyticsConfig()) {
    throw new Error(
      'Google Analytics nao configurado. Defina GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_GA4_PROPERTY_ID.'
    );
  }

  const dateRange = resolveAnalyticsDateRange(args.periodoInicio, args.periodoFim);
  if (!dateRange.hasStarted) {
    throw new Error('Campanha ainda nao iniciou. Analytics disponivel apos a data de inicio.');
  }

  const accessToken = await getGoogleAccessToken();
  const searchConsoleSiteUrl = resolveSearchConsoleSiteUrl(args.productUrl);

  const [ga4, gsc] = await Promise.all([
    fetchGa4CampaignMetrics({
      campaignName: args.campaignName,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      accessToken,
    }),
    fetchSearchConsoleMetrics({
      siteUrl: searchConsoleSiteUrl,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      accessToken,
    }),
  ]);

  return {
    dateRange,
    ga4,
    gsc,
    searchConsoleSiteUrl,
  };
}

async function getGoogleAccessToken() {
  // Modo 1: Service Account (JWT) — requer GOOGLE_PRIVATE_KEY
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const client = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
      scopes: GOOGLE_TOKEN_SCOPES,
    });
    const credentials = await client.authorize();
    if (!credentials.access_token) {
      throw new Error('Nao foi possivel obter access token via Service Account.');
    }
    return credentials.access_token;
  }

  // Modo 2: OAuth2 com refresh token — requer GOOGLE_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const { token } = await client.getAccessToken();
    if (!token) {
      throw new Error('Nao foi possivel obter access token via OAuth2. Verifique GOOGLE_REFRESH_TOKEN.');
    }
    return token;
  }

  throw new Error('Nenhuma credencial Google configurada. Defina GOOGLE_PRIVATE_KEY (Service Account) ou GOOGLE_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN (OAuth2).');
}

async function fetchGa4CampaignMetrics(args: {
  campaignName: string;
  startDate: string;
  endDate: string;
  accessToken: string;
}): Promise<Ga4CampaignMetrics> {
  const propertyId = process.env.GOOGLE_GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('GOOGLE_GA4_PROPERTY_ID nao configurada.');
  }

  const fieldCandidates = ['sessionCampaignName', 'sessionManualCampaignName'];
  const valueCandidates = buildCampaignValueCandidates(args.campaignName);
  const matchTypes: GaMatchType[] = ['EXACT', 'CONTAINS'];
  let lastError: Error | null = null;

  for (const fieldName of fieldCandidates) {
    for (const matchType of matchTypes) {
      for (const candidate of valueCandidates) {
        let response: GaRunReportResponse;
        try {
          response = await googleJsonFetch<GaRunReportResponse>(
            `${GA4_API_BASE}/properties/${propertyId}:runReport`,
            args.accessToken,
            {
              method: 'POST',
              body: JSON.stringify({
                dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
                dimensions: [{ name: fieldName }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalRevenue' },
                  { name: 'keyEvents' },
                  { name: 'sessionKeyEventRate' },
                ],
                dimensionFilter: {
                  filter: {
                    fieldName,
                    stringFilter: {
                      matchType,
                      value: candidate,
                      caseSensitive: false,
                    },
                  },
                },
                keepEmptyRows: false,
                limit: '1',
              }),
            }
          );
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Falha desconhecida no GA4');
          continue;
        }

        const row = response.rows?.[0];
        if (!row?.metricValues?.length) {
          continue;
        }

        return {
          sessions: Number(row.metricValues[0]?.value ?? 0),
          revenue: Number(row.metricValues[1]?.value ?? 0),
          conversions: Number(row.metricValues[2]?.value ?? 0),
          conversionRate: Number(row.metricValues[3]?.value ?? 0),
          matchedField: fieldName,
          matchedValue: candidate,
          matchType,
        };
      }
    }
  }

  if (lastError) {
    console.warn('[analytics] GA4 sem match de campanha:', lastError.message);
  }

  return {
    sessions: 0,
    revenue: 0,
    conversions: 0,
    conversionRate: 0,
    matchedField: null,
    matchedValue: null,
    matchType: null,
  };
}

async function fetchSearchConsoleMetrics(args: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  accessToken: string;
  keywordsLimit?: number; // 0 = skip keywords fetch
}): Promise<SearchConsoleMetrics> {
  const sitePath = encodeURIComponent(args.siteUrl);
  const limit = args.keywordsLimit ?? 10;

  const summaryPromise = googleJsonFetch<SearchConsoleResponse>(
    `${GSC_API_BASE}/sites/${sitePath}/searchAnalytics/query`,
    args.accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        startDate: args.startDate,
        endDate: args.endDate,
        type: 'web',
        rowLimit: 1,
      }),
    }
  );

  const keywordsPromise = limit > 0
    ? googleJsonFetch<SearchConsoleResponse>(
        `${GSC_API_BASE}/sites/${sitePath}/searchAnalytics/query`,
        args.accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            startDate: args.startDate,
            endDate: args.endDate,
            dimensions: ['query'],
            type: 'web',
            rowLimit: limit,
          }),
        }
      )
    : Promise.resolve({ rows: [] } as SearchConsoleResponse);

  const [summary, keywords] = await Promise.all([summaryPromise, keywordsPromise]);

  const summaryRow = summary.rows?.[0];
  const keywordRows = (keywords.rows ?? []).map((row) => ({
    keyword: row.keys?.[0] ?? 'sem palavra-chave',
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    averagePosition: Number(row.position ?? 0),
  }));

  return {
    clicks: Number(summaryRow?.clicks ?? 0),
    impressions: Number(summaryRow?.impressions ?? 0),
    ctr: Number(summaryRow?.ctr ?? 0),
    averagePosition: Number(summaryRow?.position ?? 0),
    keywords: keywordRows,
  };
}

async function googleJsonFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSiteAnalytics(days = 30): Promise<SiteAnalyticsSnapshot> {
  const propertyId = process.env.GOOGLE_GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GOOGLE_GA4_PROPERTY_ID nao configurada.');

  const msPerDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const endDate = toIsoDate(new Date(now).toISOString());
  const startDate = toIsoDate(new Date(now - days * msPerDay).toISOString());
  const prevEnd = toIsoDate(new Date(now - days * msPerDay - msPerDay).toISOString());
  const prevStart = toIsoDate(new Date(now - 2 * days * msPerDay - msPerDay).toISOString());

  const accessToken = await getGoogleAccessToken();
  const siteUrl = resolveSearchConsoleSiteUrl();

  const ga4Body = (start: string, end: string) =>
    JSON.stringify({
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'totalRevenue' },
        { name: 'keyEvents' },
      ],
      keepEmptyRows: false,
    });

  // 6 requisições em paralelo
  const [ga4Cur, ga4Prev, ga4Pages, ga4Channels, gscCurrent, gscPrev] = await Promise.all([
    googleJsonFetch<GaRunReportResponse>(
      `${GA4_API_BASE}/properties/${propertyId}:runReport`,
      accessToken,
      { method: 'POST', body: ga4Body(startDate, endDate) }
    ),
    googleJsonFetch<GaRunReportResponse>(
      `${GA4_API_BASE}/properties/${propertyId}:runReport`,
      accessToken,
      { method: 'POST', body: ga4Body(prevStart, prevEnd) }
    ),
    googleJsonFetch<GaRunReportResponse>(
      `${GA4_API_BASE}/properties/${propertyId}:runReport`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 5,
          keepEmptyRows: false,
        }),
      }
    ),
    googleJsonFetch<GaRunReportResponse>(
      `${GA4_API_BASE}/properties/${propertyId}:runReport`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalRevenue' },
            { name: 'keyEvents' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
          keepEmptyRows: false,
        }),
      }
    ),
    fetchSearchConsoleMetrics({ siteUrl, startDate, endDate, accessToken }),
    fetchSearchConsoleMetrics({ siteUrl, startDate: prevStart, endDate: prevEnd, accessToken, keywordsLimit: 0 }),
  ]);

  const extractRow = (res: GaRunReportResponse) => res.rows?.[0];

  const ga4Current = {
    sessions: Number(extractRow(ga4Cur)?.metricValues?.[0]?.value ?? 0),
    activeUsers: Number(extractRow(ga4Cur)?.metricValues?.[1]?.value ?? 0),
    revenue: Number(extractRow(ga4Cur)?.metricValues?.[2]?.value ?? 0),
    conversions: Number(extractRow(ga4Cur)?.metricValues?.[3]?.value ?? 0),
  };
  const ga4PrevData = {
    sessions: Number(extractRow(ga4Prev)?.metricValues?.[0]?.value ?? 0),
    activeUsers: Number(extractRow(ga4Prev)?.metricValues?.[1]?.value ?? 0),
    revenue: Number(extractRow(ga4Prev)?.metricValues?.[2]?.value ?? 0),
    conversions: Number(extractRow(ga4Prev)?.metricValues?.[3]?.value ?? 0),
  };

  const topPages = (ga4Pages.rows ?? []).map((r) => ({
    page: r.dimensionValues?.[0]?.value ?? '/',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const topChannels: SiteChannelRow[] = (ga4Channels.rows ?? []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    revenue: Number(r.metricValues?.[1]?.value ?? 0),
    conversions: Number(r.metricValues?.[2]?.value ?? 0),
  }));

  const conversionRate =
    ga4Current.sessions > 0 ? ga4Current.conversions / ga4Current.sessions : 0;
  const avgOrderValue =
    ga4Current.conversions > 0 ? ga4Current.revenue / ga4Current.conversions : 0;

  return {
    period: { startDate, endDate, days },
    ga4: { ...ga4Current, conversionRate, avgOrderValue, prev: ga4PrevData, topPages, topChannels },
    gsc: {
      clicks: gscCurrent.clicks,
      impressions: gscCurrent.impressions,
      ctr: gscCurrent.ctr,
      averagePosition: gscCurrent.averagePosition,
      keywords: gscCurrent.keywords,
      prev: {
        clicks: gscPrev.clicks,
        impressions: gscPrev.impressions,
        ctr: gscPrev.ctr,
        averagePosition: gscPrev.averagePosition,
      },
    },
  };
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n');
}

function buildCampaignValueCandidates(campaignName: string) {
  const trimmed = campaignName.trim();
  const lower = trimmed.toLowerCase();
  const slug = slugify(trimmed, '-');
  const underscored = slugify(trimmed, '_');

  return Array.from(new Set([trimmed, lower, slug, underscored])).filter(Boolean);
}

function slugify(value: string, separator: '-' | '_') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
}

function toIsoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}
