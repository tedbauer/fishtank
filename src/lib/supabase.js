import { createBrowserClient } from '@supabase/ssr';

let supabase;

export function getSupabase() {
  if (supabase) return supabase;
  if (typeof window === 'undefined') return null;
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return supabase;
}
