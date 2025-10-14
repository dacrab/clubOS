// Mock environment variables for Vitest
export const PUBLIC_SUPABASE_URL = "http://localhost:54321";
export const PUBLIC_SUPABASE_ANON_KEY = "test_anon_key";

// Export as env object for $env/dynamic/public compatibility
export const env = {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
};
