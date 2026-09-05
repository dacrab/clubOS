import type { DbAction } from "$lib/types/database";

export async function api<T>(
	action: DbAction,
	opts?: {
		data?: Record<string, unknown>;
		filter?: Record<string, unknown>;
		signal?: AbortSignal;
	},
): Promise<T> {
	const res = await fetch("/api/db", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ action, data: opts?.data, filter: opts?.filter }),
		signal: opts?.signal,
	});
	const json: { error?: string } & Record<string, unknown> = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(json.error ?? "API error");
	return json as T;
}

/** Fetch an API endpoint with the given method (JSON body if provided). */
export async function apiRequest<T>(
	url: string,
	method: string,
	body?: unknown,
	opts?: { signal?: AbortSignal },
): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: { "content-type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		signal: opts?.signal,
	});
	if (!res.ok) throw new Error(await errorMessage(res));
	const json: Record<string, unknown> = await res.json().catch(() => ({}));
	return json as T;
}

/** Prefer a JSON `{ error }` payload; fall back to plain text (e.g. users API). */
async function errorMessage(res: Response): Promise<string> {
	const text = await res.text().catch(() => "");
	if (!text) return "API error";
	try {
		const parsed = JSON.parse(text) as { error?: string };
		return parsed.error ?? "API error";
	} catch {
		return text;
	}
}
