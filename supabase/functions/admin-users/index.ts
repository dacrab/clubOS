/// <reference path="../_types.d.ts" />
/* global Deno */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../_database.types.ts";

type Supa = SupabaseClient<Database>;

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
function badRequest(message: string): Response {
  return new Response(message, { status: 400 });
}
function unauthorized(message = "Unauthorized"): Response {
  return new Response(message, { status: 401 });
}
function forbidden(message = "Forbidden"): Response {
  return new Response(message, { status: 403 });
}

async function handlePost(
  req: Request,
  supaAdmin: Supa,
  callerId: string
): Promise<Response> {
  const body = await req.json();
  if (!(body.email && body.password && body.role && body.username)) {
    return badRequest("Missing required fields");
  }
  const { data: created, error } = await supaAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      role: body.role,
      username: body.username,
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });
  if (error) {
    return badRequest(error.message);
  }
  const newUserId = created.user?.id;
  if (!newUserId) {
    return new Response(null, { status: 204 });
  }
  let tenantId = body.tenant_id as string | undefined;
  if (!tenantId) {
    const { data: callerTenants } = await supaAdmin
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", callerId);
    tenantId = callerTenants?.[0]?.tenant_id as string | undefined;
  }
  if (tenantId) {
    await supaAdmin
      .from("tenant_members")
      .upsert(
        { tenant_id: tenantId, user_id: newUserId },
        { onConflict: "tenant_id,user_id" }
      );
  }
  const facilities = Array.isArray(body.facility_ids) ? body.facility_ids : [];
  if (facilities.length > 0) {
    const rows = facilities.map((fid: string) => ({
      facility_id: fid,
      user_id: newUserId,
    }));
    await supaAdmin
      .from("facility_members")
      .upsert(rows, { onConflict: "facility_id,user_id" });
  }
  return json({ id: newUserId }, { status: 201 });
}

async function handlePatch(req: Request, supaAdmin: Supa): Promise<Response> {
  const body = await req.json();
  if (!body.id) {
    return badRequest("Missing id");
  }
  await updateProfilePatch(supaAdmin, body);
  await updateAuthPatch(supaAdmin, body);
  await updateFacilitiesPatch(supaAdmin, body);
  return new Response(null, { status: 204 });
}

type PatchBody = {
  id: string;
  role?: string;
  username?: string;
  password?: string;
  active?: boolean;
  add_facility_ids?: string[];
  remove_facility_ids?: string[];
};

async function updateProfilePatch(
  supaAdmin: Supa,
  body: PatchBody
): Promise<void> {
  const profileUpdates: { role?: string; username?: string } = {};
  if (body.role) {
    profileUpdates.role = body.role;
  }
  if (typeof body.username === "string" && body.username.trim() !== "") {
    profileUpdates.username = body.username.trim();
  }
  if (!Object.keys(profileUpdates).length) {
    return;
  }
  const { error } = await supaAdmin
    .from("users")
    .update(profileUpdates)
    .eq("id", body.id);
  if (error) {
    throw new Error(error.message);
  }
}

async function updateAuthPatch(
  supaAdmin: Supa,
  body: PatchBody
): Promise<void> {
  const adminAttrs: {
    password?: string;
    user_metadata?: Record<string, unknown>;
  } = {};
  if (body.password && body.password.length > 0) {
    adminAttrs.password = body.password;
  }
  const metadata: Record<string, unknown> = {};
  if (body.role) {
    metadata.role = body.role;
  }
  if (typeof body.username === "string" && body.username.trim() !== "") {
    metadata.username = body.username.trim();
  }
  if (typeof body.active === "boolean") {
    metadata.active = body.active;
  }
  if (Object.keys(metadata).length) {
    adminAttrs.user_metadata = metadata;
  }
  if (!Object.keys(adminAttrs).length) {
    return;
  }
  const { error } = await supaAdmin.auth.admin.updateUserById(
    body.id,
    adminAttrs
  );
  if (error) {
    throw new Error(error.message);
  }
}

async function updateFacilitiesPatch(
  supaAdmin: Supa,
  body: PatchBody
): Promise<void> {
  const addFids = Array.isArray(body.add_facility_ids)
    ? body.add_facility_ids
    : [];
  const removeFids = Array.isArray(body.remove_facility_ids)
    ? body.remove_facility_ids
    : [];
  if (addFids.length) {
    const rows = addFids.map((fid: string) => ({
      facility_id: fid,
      user_id: body.id,
    }));
    const { error } = await supaAdmin
      .from("facility_members")
      .upsert(rows, { onConflict: "facility_id,user_id" });
    if (error) {
      throw new Error(error.message);
    }
  }
  if (removeFids.length) {
    const { error } = await supaAdmin
      .from("facility_members")
      .delete()
      .eq("user_id", body.id)
      .in("facility_id", removeFids);
    if (error) {
      throw new Error(error.message);
    }
  }
}

async function handleDelete(
  searchParams: URLSearchParams,
  supaAdmin: Supa
): Promise<Response> {
  const id = searchParams.get("id");
  if (!id) {
    return badRequest("Missing id");
  }
  const { error } = await supaAdmin.auth.admin.deleteUser(id);
  if (error) {
    return badRequest(error.message);
  }
  return new Response(null, { status: 204 });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!(url && anonKey && serviceKey)) {
    return new Response("Server misconfigured", { status: 500 });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return unauthorized();
  }
  const supaAuth = createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const supaAdmin = createClient<Database>(url, serviceKey);
  const { data: authData, error: authErr } = await supaAuth.auth.getUser();
  if (authErr || !authData?.user) {
    return unauthorized();
  }
  const caller = authData.user;
  const { data: profile, error: profErr } = await supaAdmin
    .from("users")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (profErr || !profile || profile.role !== "admin") {
    return forbidden();
  }
  const method = req.method.toUpperCase();
  const { searchParams } = new URL(req.url);
  try {
    if (method === "POST") {
      return handlePost(req, supaAdmin, caller.id);
    }
    if (method === "PATCH") {
      return handlePatch(req, supaAdmin);
    }
    if (method === "DELETE") {
      return handleDelete(searchParams, supaAdmin);
    }
    return new Response("Method Not Allowed", { status: 405 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return new Response(msg, { status: 500 });
  }
});
