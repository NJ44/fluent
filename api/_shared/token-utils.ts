import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const key = serviceKey || anonKey;
  if (!serviceKey && anonKey) {
    console.warn('[token-utils.getSupabase] Using anon key — writes subject to RLS');
  }
  return createClient(url, key);
}

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('SUPABASE_SERVICE_KEY is required for this operation');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
