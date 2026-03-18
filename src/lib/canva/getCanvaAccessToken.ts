import type { CanvaToken } from '@/types/campanha';
import { supabaseAdmin } from '@/lib/supabase';

const TOKEN_ENDPOINT = 'https://api.canva.com/rest/v1/oauth/token';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function buildCredentials() {
  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

function parseExpiresAt(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

async function getStoredCanvaToken(): Promise<CanvaToken | null> {
  const { data, error } = await supabaseAdmin
    .from('canva_tokens')
    .select('*')
    .eq('user_id', 'system')
    .maybeSingle();

  if (error) {
    console.warn('[canva] Falha ao consultar token salvo:', error.message);
    return null;
  }

  return (data as CanvaToken | null) ?? null;
}

export async function getCanvaConnectionStatus(): Promise<{
  connected: boolean;
  expiresAt: string | null;
  needsRefresh: boolean;
  scopes: string | null;
}> {
  const row = await getStoredCanvaToken();

  if (!row?.refresh_token) {
    return {
      connected: false,
      expiresAt: null,
      needsRefresh: false,
      scopes: null,
    };
  }

  const expiresAt = parseExpiresAt(row.expires_at);

  return {
    connected: true,
    expiresAt: row.expires_at ?? null,
    needsRefresh: expiresAt !== null ? expiresAt - REFRESH_MARGIN_MS <= Date.now() : false,
    scopes: row.scopes ?? null,
  };
}

export async function getCanvaAccessToken(): Promise<string | null> {
  const row = await getStoredCanvaToken();

  if (!row) {
    console.warn('[canva] Nenhum token encontrado. Acesse /api/canva/authorize para conectar.');
    return null;
  }

  const expiresAt = parseExpiresAt(row.expires_at);
  if (expiresAt !== null && expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return row.access_token;
  }

  console.log('[canva] Access token expirado, renovando...');

  const refreshRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${buildCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }).toString(),
  });

  if (!refreshRes.ok) {
    const errorBody = await refreshRes.text();
    console.error('[canva] Refresh falhou:', refreshRes.status, errorBody);
    await supabaseAdmin.from('canva_tokens').delete().eq('user_id', 'system');
    return null;
  }

  const newTokens = (await refreshRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  };

  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('canva_tokens')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newExpiresAt,
      scopes: newTokens.scope ?? row.scopes,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', 'system');

  console.log('[canva] Token renovado com sucesso.');
  return newTokens.access_token;
}
