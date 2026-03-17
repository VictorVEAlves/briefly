// Rota para aprovar um output individual
// Chamada pelo painel de aprovação ao clicar "Aprovar"

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  let outputId: string;
  try {
    const body = await req.json();
    outputId = body.outputId;
    if (!outputId) throw new Error('outputId ausente');
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('campanha_outputs')
    .update({ status: 'aprovado' })
    .eq('id', outputId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
