export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { archiveCampaignByClickupListId } from '@/lib/campaign-archive';
import { ClickUpApiError, getList } from '@/lib/clickup';
import { supabaseAdmin } from '@/lib/supabase';

type ReconcileError = {
  campanhaId: string;
  clickupListId: string;
  status?: number;
  message: string;
};

function isAuthorized(req: Request) {
  const auth = req.headers.get('authorization');
  const acceptedSecrets = [
    process.env.INTERNAL_API_SECRET,
    process.env.CRON_SECRET,
  ].filter(Boolean);

  return acceptedSecrets.some((secret) => auth === `Bearer ${secret}`);
}

async function runReconciliation() {
  const { data: campanhas, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, nome, clickup_list_id')
    .not('clickup_list_id', 'is', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar campanhas para reconciliacao: ${error.message}`);
  }

  let checked = 0;
  let archived = 0;
  let skipped = 0;
  const errors: ReconcileError[] = [];

  for (const campanha of campanhas ?? []) {
    if (!campanha.clickup_list_id) {
      skipped += 1;
      continue;
    }

    checked += 1;

    try {
      await getList(campanha.clickup_list_id);
    } catch (error) {
      if (error instanceof ClickUpApiError && error.status === 404) {
        const result = await archiveCampaignByClickupListId(
          campanha.clickup_list_id,
          'clickup_missing_reconcile'
        );

        if (result.outcome === 'archived') {
          archived += 1;
          continue;
        }

        skipped += 1;
        continue;
      }

      if (
        error instanceof ClickUpApiError &&
        [401, 403, 429].includes(error.status)
      ) {
        skipped += 1;
        errors.push({
          campanhaId: campanha.id,
          clickupListId: campanha.clickup_list_id,
          status: error.status,
          message: error.message,
        });
        continue;
      }

      if (error instanceof ClickUpApiError && error.status >= 500) {
        skipped += 1;
        errors.push({
          campanhaId: campanha.id,
          clickupListId: campanha.clickup_list_id,
          status: error.status,
          message: error.message,
        });
        continue;
      }

      throw error;
    }
  }

  return {
    ok: true,
    checked,
    archived,
    skipped,
    errors,
  };
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const summary = await runReconciliation();
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido na reconciliacao';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
