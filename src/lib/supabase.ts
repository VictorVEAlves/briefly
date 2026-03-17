// Cliente Supabase
// - supabaseAdmin: usa service role — para uso exclusivo em API routes (servidor)
// - createBrowserClient: usa anon key — para Realtime subscriptions no frontend

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/campanha';

// Cliente admin para todas as operações server-side
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Cliente browser — apenas para Realtime no frontend (não acessa dados sensíveis)
export const createBrowserClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
