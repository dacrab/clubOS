import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const url = publicEnv.PUBLIC_SUPABASE_URL || privateEnv.SUPABASE_URL;
const serviceKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!(url && serviceKey)) {
  throw new Error('Missing SUPABASE_URL/PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(url, serviceKey);


