import { writable } from "svelte/store";
import { supabase } from "$lib/supabaseClient";

export type AppUser = {
  id: string;
  email: string | null;
  role: "admin" | "staff" | "secretary" | null;
  username: string | null;
  tenantIds: string[];
};

export const currentUser = writable<AppUser | null>(null);

export async function loadCurrentUser(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    currentUser.set(null);
    return;
  }
  const { data: profile } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("id", session.user.id)
    .single();
  // load tenant memberships
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", session.user.id);
  currentUser.set({
    id: session.user.id,
    email: session.user.email ?? null,
    role: (profile?.role as "admin" | "staff" | "secretary") ?? null,
    username: (profile?.username as string | null) ?? null,
    tenantIds: (memberships ?? []).map((m) => {
      // biome-ignore lint/style/useNamingConvention: DB column name
      return (m as { tenant_id: string }).tenant_id;
    }),
  });
}
