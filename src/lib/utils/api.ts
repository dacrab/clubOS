import type { DbAction } from "$lib/types/database";

/**
 * All /api/db success responses are raw JSON payloads (rows, `row | null`,
 * `{ success: true }`); failures respond `{ error }` with a non-2xx status.
 * Parse 2xx bodies strictly so shape drift fails loudly at this boundary
 * instead of surfacing as `undefined` deep inside a component. A 2xx body
 * carrying an error envelope is drift too — throw rather than return it.
 */
async function parseOkBody(res: Response): Promise<unknown> {
	const body = await res.text();
	if (body === "") return null;
	try {
		return JSON.parse(body) as unknown;
	} catch {
		throw new Error("Malformed API response");
	}
}

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
	if (!res.ok) throw new Error(await errorMessage(res));
	const payload = await parseOkBody(res);
	if (payload && typeof payload === "object" && "error" in payload) {
		const err = (payload as Record<string, unknown>).error;
		throw new Error(typeof err === "string" ? err : "Malformed API response");
	}
	// Single justified cast: T is the caller's declared shape for this action;
	// malformed payloads are rejected above.
	return payload as T;
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
	// Single justified cast: same-origin endpoints whose callers do not read
	// the success payload (the users API responds 204 No Content).
	return (await parseOkBody(res)) as T;
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
