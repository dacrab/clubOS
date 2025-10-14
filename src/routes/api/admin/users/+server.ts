import type { RequestHandler } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

function getFunctionsBaseUrl() {
  const { PUBLIC_SUPABASE_URL: url } = publicEnv as {
    PUBLIC_SUPABASE_URL?: string;
  };
  if (!url) {
    throw new Error("Missing PUBLIC_SUPABASE_URL");
  }
  return `${url}/functions/v1`;
}

function getAuthHeader(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : {};
}

export const POST: RequestHandler = async ({ request }) => {
  const base = getFunctionsBaseUrl();
  const headers: HeadersInit = {
    ...getAuthHeader(request),
    "content-type": "application/json",
  };
  const res = await fetch(`${base}/admin-create-user`, {
    method: "POST",
    headers,
    body: await request.text(), // pass-through raw body
  });
  return new Response(await res.text(), { status: res.status });
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const base = getFunctionsBaseUrl();
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }
  const res = await fetch(
    `${base}/admin-delete-user?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: getAuthHeader(request),
    }
  );
  return new Response(await res.text(), { status: res.status });
};

export const PATCH: RequestHandler = async ({ request }) => {
  const base = getFunctionsBaseUrl();
  const headers: HeadersInit = {
    ...getAuthHeader(request),
    "content-type": "application/json",
  };
  const res = await fetch(`${base}/admin-update-user`, {
    method: "PATCH",
    headers,
    body: await request.text(),
  });
  return new Response(await res.text(), { status: res.status });
};
