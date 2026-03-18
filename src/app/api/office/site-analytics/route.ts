export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { fetchSiteAnalytics, hasAnalyticsConfig } from '@/lib/analytics';

export async function GET(req: Request) {
  if (!hasAnalyticsConfig()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get('period') ?? '30');
  const validDays = ([7, 30, 90] as number[]).includes(days) ? days : 30;

  try {
    const snapshot = await fetchSiteAnalytics(validDays);
    return NextResponse.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[site-analytics] erro:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
