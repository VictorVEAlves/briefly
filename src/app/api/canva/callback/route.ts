import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const TOKEN_ENDPOINT = 'https://api.canva.com/rest/v1/oauth/token';

function getCanonicalBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || 'http://127.0.0.1:3000';
}

function buildCredentials() {
  const clientId     = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

export async function GET(req: Request) {
  const url    = new URL(req.url);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');
  const errMsg = url.searchParams.get('error');
  const errDescription = url.searchParams.get('error_description');
  const canonicalBaseUrl = getCanonicalBaseUrl(req);

  if (errMsg) {
    const errorValue = errDescription ? `${errMsg}:${errDescription}` : errMsg;
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=${encodeURIComponent(errorValue)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=missing_params`);
  }

  const cookieStore = await cookies();
  const savedState    = cookieStore.get('canva_oauth_state')?.value;
  const codeVerifier  = cookieStore.get('canva_code_verifier')?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=state_mismatch`);
  }

  if (!codeVerifier) {
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=missing_verifier`);
  }

  // Clear temporary cookies
  cookieStore.delete('canva_oauth_state');
  cookieStore.delete('canva_code_verifier');

  const redirectUri = `${canonicalBaseUrl}/api/canva/callback`;

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${buildCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error('[canva] Token exchange falhou:', tokenRes.status, body);
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json() as {
    access_token:  string;
    refresh_token: string;
    expires_in:    number;
    scope?:        string;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: upsertError } = await supabaseAdmin
    .from('canva_tokens')
    .upsert(
      {
        user_id:       'system',
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    expiresAt,
        scopes:        tokens.scope ?? null,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('[canva] Erro ao salvar tokens:', upsertError);
    return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_error=db_save_failed`);
  }

  console.log('[canva] Tokens salvos com sucesso.');
  return NextResponse.redirect(`${canonicalBaseUrl}/office?canva_connected=true`);
}
