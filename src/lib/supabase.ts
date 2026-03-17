// Cliente Supabase
// - supabaseAdmin: usa service role para uso exclusivo em rotas server-side
// - createBrowserClient: usa anon key para Realtime no frontend

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/campanha';

// Cliente admin para todas as operacoes server-side
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Cliente browser apenas para Realtime no frontend
export const createBrowserClient = (
  supabaseUrl: string,
  supabaseAnonKey: string
) => createClient<Database>(supabaseUrl, supabaseAnonKey);
