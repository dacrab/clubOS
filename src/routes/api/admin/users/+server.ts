import type { RequestHandler } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

const getBaseUrl = (): string => {
	const url = (publicEnv as { PUBLIC_SUPABASE_URL?: string }).PUBLIC_SUPABASE_URL;
	if (!url) throw new Error("Missing PUBLIC_SUPABASE_URL");
	return `${url}/functions/v1`;
};

const authHeader = (token?: string | null): HeadersInit => token ? { Authorization: `Bearer ${token}` } : {};

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = locals.session?.access_token;
	if (!token) return new Response("Unauthorized", { status: 401 });
	const res = await fetch(`${getBaseUrl()}/admin-create-user`, { method: "POST", headers: { ...authHeader(token), "content-type": "application/json" }, body: await request.text() });
	return new Response(await res.text(), { status: res.status });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	const id = url.searchParams.get("id");
	if (!id) return new Response("Missing id", { status: 400 });
	const res = await fetch(`${getBaseUrl()}/admin-delete-user?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeader(locals.session?.access_token) });
	return new Response(await res.text(), { status: res.status });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const token = locals.session?.access_token;
	if (!token) return new Response("Unauthorized", { status: 401 });
	const res = await fetch(`${getBaseUrl()}/admin-update-user`, { method: "PATCH", headers: { ...authHeader(token), "content-type": "application/json" }, body: await request.text() });
	return new Response(await res.text(), { status: res.status });
};

export const PATCH: RequestHandler = PUT;
