import 'server-only';

// Cliente Supabase server-only
// - supabaseAdmin: usa service role para uso exclusivo em rotas e server components

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/campanha';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
