import { NextResponse } from 'next/server';
import { getCanvaAccessToken } from '@/lib/canva/getCanvaAccessToken';

export async function GET() {
  const token = await getCanvaAccessToken();
  return NextResponse.json({ connected: token !== null });
}
