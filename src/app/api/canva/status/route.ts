import { NextResponse } from 'next/server';
import { getCanvaConnectionStatus } from '@/lib/canva/getCanvaAccessToken';

export async function GET() {
  const status = await getCanvaConnectionStatus();
  return NextResponse.json(status);
}
