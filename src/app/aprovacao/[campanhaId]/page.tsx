// Painel de Aprovação — Server Component + Client Component com Realtime
// Server: carrega dados iniciais da campanha e outputs
// Client: escuta Supabase Realtime para atualizações em tempo real

import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import AprovacaoClient from './AprovacaoClient';

type PageProps = {
  params: { campanhaId: string };
};

export default async function AprovacaoPage({ params }: PageProps) {
  const { campanhaId } = params;

  // Carrega campanha
  const { data: campanha } = await supabaseAdmin
    .from('campanhas')
    .select('*')
    .eq('id', campanhaId)
    .single();

  if (!campanha) notFound();

  // Carrega outputs e logs iniciais
  const { data: outputs } = await supabaseAdmin
    .from('campanha_outputs')
    .select('*')
    .eq('campanha_id', campanhaId)
    .order('created_at', { ascending: true });

  const { data: logs } = await supabaseAdmin
    .from('agente_logs')
    .select('*')
    .eq('campanha_id', campanhaId)
    .order('created_at', { ascending: true });

  return (
    <AprovacaoClient
      campanhaId={campanhaId}
      initialCampanha={campanha}
      initialOutputs={outputs ?? []}
      initialLogs={logs ?? []}
    />
  );
}
