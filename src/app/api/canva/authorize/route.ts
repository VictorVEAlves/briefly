import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const SCOPES = [
  'asset:read',
  'asset:write',
  'design:content:read',
  'design:content:write',
  'design:meta:read',
].join(' ');

function getCanonicalBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || 'http://127.0.0.1:3000';
}

export async function GET(req: Request) {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'CANVA_CLIENT_ID nao configurado' }, { status: 500 });
  }

  const currentUrl = new URL(req.url);
  const canonicalBaseUrl = getCanonicalBaseUrl(req);
  const canonicalOrigin = new URL(canonicalBaseUrl).origin;
  if (currentUrl.origin !== canonicalOrigin) {
    return NextResponse.redirect(`${canonicalBaseUrl}${currentUrl.pathname}${currentUrl.search}`);
  }

  const codeVerifier  = crypto.randomBytes(96).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = crypto.randomBytes(32).toString('base64url');

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };

  cookieStore.set('canva_code_verifier', codeVerifier, cookieOpts);
  cookieStore.set('canva_oauth_state',   state,         cookieOpts);

  const redirectUri = `${canonicalBaseUrl}/api/canva/callback`;

  const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
  authUrl.searchParams.set('response_type',          'code');
  authUrl.searchParams.set('client_id',              clientId);
  authUrl.searchParams.set('scope',                  SCOPES);
  authUrl.searchParams.set('redirect_uri',           redirectUri);
  authUrl.searchParams.set('state',                  state);
  authUrl.searchParams.set('code_challenge',         codeChallenge);
  authUrl.searchParams.set('code_challenge_method',  'S256');

  return NextResponse.redirect(authUrl.toString());
}
