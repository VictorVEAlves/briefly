// Cliente Supabase para browser
// Usado apenas para Realtime no frontend

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/campanha';

export const createBrowserClient = (
  supabaseUrl: string,
  supabaseAnonKey: string
) => createClient<Database>(supabaseUrl, supabaseAnonKey);
