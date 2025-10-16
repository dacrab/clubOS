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
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
  const adminClient = createClient(supabaseUrl, serviceRole);
  return {
    authedClient,
    adminClient
  } as const;
}
async function requireAdmin(req: Request): Promise<{ status: number; error?: string; userId?: string }> {
  const { authedClient } = getClients(req);
  const { data: userData } = await authedClient.auth.getUser();
  if (!userData?.user) return {
    status: 401,
    error: "Unauthorized"
  };
  const { data: profile, error } = await authedClient.from("users").select("role").eq("id", userData.user.id).single();
  if (error) return {
    status: 400,
    error: error.message
  };
  if (profile?.role !== "admin") return {
    status: 403,
    error: "Forbidden"
  };
  return {
    status: 200,
    userId: userData.user.id
  };
}
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const adminCheck = await requireAdmin(req);
  if (adminCheck.status !== 200) {
    return new Response(adminCheck.error, { status: adminCheck.status });
  }
  const body: { email?: string; password?: string; role?: string; username?: string; active?: boolean; facility_ids?: string[] } = await req.json();
  if (!body?.email || !body?.password || !body?.role || !body?.username) {
    return new Response("Missing required fields", { status: 400 });
  }
  const { authedClient, adminClient } = getClients(req);
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { role: body.role, username: body.username, active: body.active ?? true }
  });
  if (createErr) return new Response(createErr.message, { status: 400 });
  const newUserId = created.user?.id;
  if (!newUserId) return new Response("Failed to create user", { status: 400 });
  const { data: adminTenants } = await authedClient.from("tenant_members").select("tenant_id").order("tenant_id").limit(1);
  const tenantId = adminTenants?.[0]?.tenant_id as string | undefined;
  if (tenantId) {
    const { error } = await adminClient.from("tenant_members").insert({ tenant_id: tenantId, user_id: newUserId });
    if (error) return new Response(error.message, { status: 400 });
  }
  if (Array.isArray(body.facility_ids) && body.facility_ids.length) {
    if (!tenantId) return new Response("Admin has no tenant scope", { status: 400 });
    const { data: facilities, error } = await adminClient.from("facilities").select("id, tenant_id").in("id", body.facility_ids);
    if (error) return new Response(error.message, { status: 400 });
    const allowed = (facilities ?? []).filter((f)=>f.tenant_id === tenantId).map((f)=>f.id);
    if (allowed.length) {
      const rows = allowed.map((fid)=>({ facility_id: fid as string, user_id: newUserId }));
      const { error: fmErr } = await adminClient.from("facility_members").insert(rows);
      if (fmErr) return new Response(fmErr.message, { status: 400 });
    }
  }
  return Response.json({ id: newUserId });
});
