import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  let nome: string;
  let especialidade: string;
  let instrucoes: string | undefined;
  let ativo_por: string | undefined;
  let cor: string | undefined;

  try {
    const body = await req.json();
    nome = body.nome;
    especialidade = body.especialidade;
    instrucoes = body.instrucoes;
    ativo_por = body.ativo_por;
    cor = body.cor;

    if (!nome || !especialidade) throw new Error('nome e especialidade sao obrigatorios');
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  // Derive a slug ID from the name
  const id = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);

  if (!id) {
    return NextResponse.json({ error: 'Nome invalido para gerar ID' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('agentes')
    .insert({
      id,
      nome,
      especialidade,
      instrucoes: instrucoes ?? null,
      ativo_por: ativo_por ?? 'manual',
      status: 'idle',
      ativo: true,
      emoji: '🤖',
      cor: typeof cor === 'string' && cor.trim() ? cor.trim() : '#4a4a6a',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ agente: data });
}
