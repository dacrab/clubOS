import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOpenSession(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase
    .from("register_sessions")
    .select("id, closed_at")
    .order("opened_at", { ascending: false })
    .limit(1);
  if (error) {
    return null;
  }
  const latest = data?.[0];
  if (latest && !latest.closed_at) {
    return latest.id as string;
  }
  return null;
}

export async function ensureOpenSession(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const existing = await getOpenSession(supabase);
  if (existing) {
    return existing;
  }
  const { data, error } = await supabase
    .from("register_sessions")
    .insert({ opened_by: userId })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return (data as unknown as { id: string }).id as string;
}

// Minimal typed wrapper for RPC calls we use in this app
function callRpc<T>(
  supabase: SupabaseClient,
  fn: string,
  params: Record<string, unknown>
): Promise<{ data: T | null; error: unknown | null }> {
  return supabase.rpc(fn, params) as unknown as Promise<{
    data: T | null;
    error: unknown | null;
  }>;
}

export async function closeRegister(
  supabase: SupabaseClient,
  sessionId: string,
  notes: Record<string, unknown> | null = null
): Promise<string> {
  const { data, error } = await callRpc<string>(
    supabase,
    "close_register_session",
    {
      p_session_id: sessionId,
      p_notes: notes,
    }
  );
  if (error) {
    throw error;
  }
  return (data as string) ?? "";
}