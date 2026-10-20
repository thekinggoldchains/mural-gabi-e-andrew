import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
