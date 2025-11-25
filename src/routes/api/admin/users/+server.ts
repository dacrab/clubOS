import type { RequestHandler } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

function getFunctionsBaseUrl(): string {
	const { PUBLIC_SUPABASE_URL: url } = publicEnv as {
		PUBLIC_SUPABASE_URL?: string;
	};
	if (!url) {
		throw new Error("Missing PUBLIC_SUPABASE_URL");
	}
	return `${url}/functions/v1`;
}

function buildAuthHeader(token: string | null | undefined): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const base = getFunctionsBaseUrl();
	const token = locals.session?.access_token;
	if (!token) return new Response("Unauthorized", { status: 401 });
	const headers: HeadersInit = {
		...buildAuthHeader(token),
		"content-type": "application/json",
	};
	const res = await fetch(`${base}/admin-create-user`, {
		method: "POST",
		headers,
		body: await request.text(), // pass-through raw body
	});
	return new Response(await res.text(), { status: res.status });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	const base = getFunctionsBaseUrl();
	const id = url.searchParams.get("id");
	if (!id) {
		return new Response("Missing id", { status: 400 });
	}
	const res = await fetch(`${base}/admin-delete-user?id=${encodeURIComponent(id)}`, {
		method: "DELETE",
		headers: buildAuthHeader(locals.session?.access_token),
	});
	return new Response(await res.text(), { status: res.status });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const base = getFunctionsBaseUrl();
	const token = locals.session?.access_token;
	if (!token) return new Response("Unauthorized", { status: 401 });
	const headers: HeadersInit = {
		...buildAuthHeader(token),
		"content-type": "application/json",
	};
	const res = await fetch(`${base}/admin-update-user`, {
		method: "PATCH",
		headers,
		body: await request.text(),
	});
	return new Response(await res.text(), { status: res.status });
};
