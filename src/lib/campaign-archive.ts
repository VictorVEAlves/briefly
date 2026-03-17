import { supabaseAdmin } from './supabase';

export type CampaignArchiveReason =
  | 'clickup_deleted'
  | 'clickup_missing_reconcile';

export type ArchiveCampaignResult =
  | {
      outcome: 'archived';
      campanhaId: string;
      clickupListId: string;
    }
  | {
      outcome: 'already_archived' | 'not_found';
      campanhaId?: string;
      clickupListId: string;
    };

export async function archiveCampaignByClickupListId(
  clickupListId: string,
  reason: CampaignArchiveReason
): Promise<ArchiveCampaignResult> {
  const { data: campanha, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, archived_at')
    .eq('clickup_list_id', clickupListId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao localizar campanha para list ${clickupListId}: ${error.message}`);
  }

  if (!campanha) {
    return { outcome: 'not_found', clickupListId };
  }

  if (campanha.archived_at) {
    return {
      outcome: 'already_archived',
      campanhaId: campanha.id,
      clickupListId,
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from('campanhas')
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: reason,
    })
    .eq('id', campanha.id);

  if (updateError) {
    throw new Error(`Falha ao arquivar campanha ${campanha.id}: ${updateError.message}`);
  }

  return {
    outcome: 'archived',
    campanhaId: campanha.id,
    clickupListId,
  };
}
