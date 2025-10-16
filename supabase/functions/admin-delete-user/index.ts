/// <reference path="../_types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
function getClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRole) {
    throw new Error("Missing SUPABASE env vars");
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const adminClient = createClient(supabaseUrl, serviceRole);
  return { authedClient, adminClient };
}
async function requireAdmin(req: Request): Promise<{ status: number; error?: string }> {
  const { authedClient } = getClients(req);
  const { data: userData } = await authedClient.auth.getUser();
  if (!userData?.user) return { status: 401, error: "Unauthorized" };
  const { data: profile, error } = await authedClient.from("users").select("role").eq("id", userData.user.id).single();
  if (error) return { status: 400, error: error.message };
  if (profile?.role !== "admin") return { status: 403, error: "Forbidden" };
  return { status: 200 };
}
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const adminCheck = await requireAdmin(req);
  if (adminCheck.status !== 200) {
    return new Response(adminCheck.error, { status: adminCheck.status });
  }
  let id: string | null = null;
  if (req.method === "DELETE") {
    const url = new URL(req.url);
    id = url.searchParams.get("id");
  } else {
    const body = await req.json().catch(()=>null);
    id = (body?.id as string | undefined) ?? null;
  }
  if (!id) return new Response("Missing id", { status: 400 });
  const { adminClient } = getClients(req);
  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) return new Response(error.message, { status: 400 });
  return new Response(null, { status: 204 });
});
