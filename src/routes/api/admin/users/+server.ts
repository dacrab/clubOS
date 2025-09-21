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
