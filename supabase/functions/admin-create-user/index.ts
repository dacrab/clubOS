/// <reference path="../_types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../_database.types.ts";

function getClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!(supabaseUrl && anonKey && serviceRole)) {
    throw new Error("Missing SUPABASE env vars");
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const authedClient = createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const adminClient = createClient<Database>(supabaseUrl, serviceRole);
  return {
    authedClient,
    adminClient,
  } as const;
}
async function requireAdmin(
  req: Request
): Promise<{ status: number; error?: string; userId?: string }> {
  const { authedClient } = getClients(req);
  const { data: userData } = await authedClient.auth.getUser();
  if (!userData?.user) {
    return {
      status: 401,
      error: "Unauthorized",
    };
  }
  const { data: profile, error } = await authedClient
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (error) {
    return {
      status: 400,
      error: error.message,
    };
  }
  if (profile?.role !== "admin") {
    return {
      status: 403,
      error: "Forbidden",
    };
  }
  return {
    status: 200,
    userId: userData.user.id,
  };
}
type CreateUserBody = {
  email?: string;
  password?: string;
  role?: string;
  username?: string;
  active?: boolean;
  facility_ids?: string[];
};

type CreateUserRequired = Required<
  Pick<CreateUserBody, "email" | "password" | "role" | "username">
> &
  Omit<CreateUserBody, "email" | "password" | "role" | "username">;

async function createAuthUser(
  adminClient: SupabaseClient<Database>,
  body: CreateUserRequired
): Promise<string | Response> {
  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: body.role,
        username: body.username,
        active: body.active ?? true,
      },
    });
  if (createErr) {
    return new Response(createErr.message, { status: 400 });
  }
  const newUserId = created.user?.id;
  if (!newUserId) {
    return new Response("Failed to create user", { status: 400 });
  }
  return newUserId;
}

async function resolveTenantId(
  authedClient: SupabaseClient<Database>
): Promise<string | undefined> {
  const { data: adminTenants } = await authedClient
    .from("tenant_members")
    .select("tenant_id")
    .order("tenant_id")
    .limit(1);
  const tenantId = adminTenants?.[0]?.tenant_id as string | undefined;
  return tenantId;
}

async function maybeAssignTenantMember(
  adminClient: SupabaseClient<Database>,
  tenantId: string | undefined,
  newUserId: string
): Promise<Response | null> {
  if (!tenantId) {
    return null;
  }
  const { error } = await adminClient
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: newUserId });
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  return null;
}

async function maybeAssignFacilities(
  adminClient: SupabaseClient<Database>,
  tenantId: string | undefined,
  facilityIds: string[] | undefined,
  newUserId: string
): Promise<Response | null> {
  if (!Array.isArray(facilityIds) || facilityIds.length === 0) {
    return null;
  }
  if (!tenantId) {
    return new Response("Admin has no tenant scope", { status: 400 });
  }
  const { data: facilities, error } = await adminClient
    .from("facilities")
    .select("id, tenant_id")
    .in("id", facilityIds);
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  const allowed = (facilities ?? [])
    .filter((f) => f.tenant_id === tenantId)
    .map((f) => f.id);
  if (!allowed.length) {
    return null;
  }
  const rows = allowed.map((fid) => ({ facility_id: fid, user_id: newUserId }));
  const { error: fmErr } = await adminClient
    .from("facility_members")
    .insert(rows);
  if (fmErr) {
    return new Response(fmErr.message, { status: 400 });
  }
  return null;
}

async function createUserFlow(
  req: Request,
  authedClient: SupabaseClient<Database>,
  adminClient: SupabaseClient<Database>
): Promise<Response> {
  const body: CreateUserBody = await req.json();
  if (!(body?.email && body?.password && body?.role && body?.username)) {
    return new Response("Missing required fields", { status: 400 });
  }
  const idOrResp = await createAuthUser(
    adminClient,
    body as CreateUserRequired
  );
  if (idOrResp instanceof Response) {
    return idOrResp;
  }
  const newUserId = idOrResp;
  const tenantId = await resolveTenantId(authedClient);
  const tmErr = await maybeAssignTenantMember(adminClient, tenantId, newUserId);
  if (tmErr) {
    return tmErr;
  }
  const fmErr = await maybeAssignFacilities(
    adminClient,
    tenantId,
    body.facility_ids,
    newUserId
  );
  if (fmErr) {
    return fmErr;
  }
  return Response.json({ id: newUserId });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const STATUS_OK = 200;
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const adminCheck = await requireAdmin(req);
  if (adminCheck.status !== STATUS_OK) {
    return new Response(adminCheck.error, { status: adminCheck.status });
  }
  const { authedClient, adminClient } = getClients(req);
  return createUserFlow(req, authedClient, adminClient);
});
