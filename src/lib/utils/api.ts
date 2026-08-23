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
