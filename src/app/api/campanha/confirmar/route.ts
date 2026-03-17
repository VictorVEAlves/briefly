// Rota de confirmação final da campanha
// Chamada quando todos os outputs estão aprovados
// 1. Atualiza campanha para status 'aprovada'
// 2. Atualiza tasks do ClickUp para status 'complete'

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateTask } from '@/lib/clickup';

export async function POST(req: Request) {
  let campanhaId: string;
  try {
    const body = await req.json();
    campanhaId = body.campanhaId;
    if (!campanhaId) throw new Error('campanhaId ausente');
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // 1. Verifica se todos os outputs estão aprovados
  const { data: outputs, error: outputsError } = await supabaseAdmin
    .from('campanha_outputs')
    .select('id, status')
    .eq('campanha_id', campanhaId);

  if (outputsError) {
    return NextResponse.json({ error: outputsError.message }, { status: 500 });
  }

  const allApproved = outputs?.every((o) => o.status === 'aprovado');
  if (!allApproved) {
    return NextResponse.json(
      { error: 'Nem todos os outputs foram aprovados' },
      { status: 422 }
    );
  }

  // 2. Atualiza campanha
  const { error: updateError } = await supabaseAdmin
    .from('campanhas')
    .update({ status: 'aprovada' })
    .eq('id', campanhaId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. Atualiza tasks de revisão no ClickUp para 'complete'
  // Busca a lista da campanha para encontrar tasks
  const { data: campanha } = await supabaseAdmin
    .from('campanhas')
    .select('clickup_list_id, nome')
    .eq('id', campanhaId)
    .single();

  if (campanha?.clickup_list_id) {
    try {
      // Busca tasks da lista via API ClickUp e marca as de revisão como completas
      const res = await fetch(
        `https://api.clickup.com/api/v2/list/${campanha.clickup_list_id}/task`,
        { headers: { Authorization: process.env.CLICKUP_API_KEY! } }
      );

      if (res.ok) {
        const data = await res.json();
        const tasks: Array<{ id: string; name: string }> = data.tasks ?? [];

        // Marca tasks de revisão e aprovação como concluídas
        const reviewTasks = tasks.filter((t) =>
          t.name.toLowerCase().includes('revisão') ||
          t.name.toLowerCase().includes('aprovação') ||
          t.name.toLowerCase().includes('revisar')
        );

        await Promise.allSettled(
          reviewTasks.map((t) => updateTask(t.id, { status: 'complete' }))
        );

        console.log(`[confirmar] ${reviewTasks.length} tasks de revisão marcadas como completas`);
      }
    } catch (err) {
      // Falha não bloqueia a confirmação — apenas loga
      console.warn('[confirmar] erro ao atualizar tasks ClickUp:', err);
    }
  }

  return NextResponse.json({ ok: true });
}
