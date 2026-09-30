import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env as Record<string, string | undefined>);
const rawUrl = env?.VITE_SUPABASE_URL ?? env?.SUPABASE_URL ?? '';
const rawKey = env?.VITE_SUPABASE_ANON_KEY ?? env?.SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  !rawUrl.includes('placeholder') &&
  rawKey &&
  !rawKey.includes('placeholder')
);

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
