import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env as Record<string, string | undefined>);
const supabaseUrl = env?.VITE_SUPABASE_URL ?? env?.SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY ?? env?.SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
