import type { RequestHandler } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/supabaseAdmin";
import { supabase } from "$lib/supabaseClient";

async function requireAdmin(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return null;
  }
  const token = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return null;
  }
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") {
    return null;
  }
  return user;
}

export const POST: RequestHandler = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) {
    return new Response("Forbidden", { status: 403 });
  }
  const body = await request.json();
  const { email, password, role, username } = body as {
    email: string;
    password: string;
    role: "admin" | "staff" | "secretary";
    username: string;
  };
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, username },
  });
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  // Add the new user to the same tenant(s) as the admin creating them (simple: first tenant)
  const { data: adminTenants } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", admin.id);
  const tenantId = adminTenants?.[0]?.tenant_id as string | undefined;
  if (tenantId && data.user?.id) {
    await supabaseAdmin.from("tenant_members").insert({
      tenant_id: tenantId,
      user_id: data.user.id,
    });
  }
  return Response.json({ id: data.user?.id });
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const admin = await requireAdmin(request);
  if (!admin) {
    return new Response("Forbidden", { status: 403 });
  }
  const userId = url.searchParams.get("id");
  if (!userId) {
    return new Response("Missing id", { status: 400 });
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  return new Response(null, { status: 204 });
};

export const PATCH: RequestHandler = async ({ request }) => {
  const admin = await requireAdmin(request);
  if (!admin) {
    return new Response("Forbidden", { status: 403 });
  }
  type UserRole = "admin" | "staff" | "secretary";

  const body = (await request.json()) as {
    id?: string;
    role?: UserRole;
    username?: string;
    password?: string;
    active?: boolean;
  };

  const id = body.id ?? "";
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  async function updateProfile(): Promise<Response | null> {
    const updates: Partial<{ role: UserRole; username: string }> = {};
    if (body.role) {
      updates.role = body.role;
    }
    if (typeof body.username === "string" && body.username.trim() !== "") {
      updates.username = body.username.trim();
    }
    if (Object.keys(updates).length === 0) {
      return null;
    }
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id);
    if (profileError) {
      return new Response(profileError.message, { status: 400 });
    }
    return null;
  }

  function buildAdminAttrs(): {
    password?: string;
    user_metadata?: { role?: UserRole; username?: string; active?: boolean };
  } {
    const adminAttrs: {
      password?: string;
      user_metadata?: { role?: UserRole; username?: string; active?: boolean };
    } = {};
    if (body.password && body.password.length > 0) {
      adminAttrs.password = body.password;
    }
    const user_meta: { role?: UserRole; username?: string; active?: boolean } =
      {};
    if (body.role) {
      user_meta.role = body.role;
    }
    if (typeof body.username === "string" && body.username.trim() !== "") {
      user_meta.username = body.username.trim();
    }
    if (typeof body.active === "boolean") {
      user_meta.active = body.active;
    }
    if (Object.keys(user_meta).length > 0) {
      adminAttrs.user_metadata = user_meta;
    }
    return adminAttrs;
  }

  async function updateAuth(): Promise<Response | null> {
    const adminAttrs = buildAdminAttrs();
    if (Object.keys(adminAttrs).length === 0) {
      return null;
    }
    const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      adminAttrs
    );
    if (adminError) {
      return new Response(adminError.message, { status: 400 });
    }
    return null;
  }

  const profileResult = await updateProfile();
  if (profileResult) {
    return profileResult;
  }
  const authResult = await updateAuth();
  if (authResult) {
    return authResult;
  }
  return new Response(null, { status: 204 });
};
