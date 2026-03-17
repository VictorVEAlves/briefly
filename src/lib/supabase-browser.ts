// Cliente Supabase para browser
// Usado apenas para Realtime no frontend

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/campanha';

type BrowserClientCache = Record<string, SupabaseClient<Database>>;

declare global {
  let __brieflySupabaseBrowserClients: BrowserClientCache | undefined;
}

export const createBrowserClient = (
  supabaseUrl: string,
  supabaseAnonKey: string
) => {
  if (typeof window === 'undefined') {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  const cacheKey = `${supabaseUrl}::${supabaseAnonKey}`;
  const browserGlobals = globalThis as typeof globalThis & {
    __brieflySupabaseBrowserClients?: BrowserClientCache;
  };
  const cache = (browserGlobals.__brieflySupabaseBrowserClients ??= {});

  if (!cache[cacheKey]) {
    cache[cacheKey] = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return cache[cacheKey];
};
