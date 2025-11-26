import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { KEEP_ALIVE_CONFIG } from "$lib/config/keep-alive-config";
import { generateRandomString, pingEndpoint } from "$lib/server/keep-alive-helper";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

type Status = "success" | "skipped" | "failed";

async function selectRandom(admin: SupabaseClient, table: string, col: string, val: string): Promise<{ count: number; error?: string }> {
	const { data, error } = await admin.from(table).select(col).eq(col, val).limit(1);
	return error ? { count: 0, error: error.message } : { count: data?.length ?? 0 };
}

async function insertDelete(admin: SupabaseClient, run: boolean, table: string, col: string, val: string): Promise<{ insert: Status; delete: Status }> {
	if (!run) return { insert: "skipped", delete: "skipped" };
	const ins = await admin.from(table).insert({ [col]: val });
	const del = await admin.from(table).delete().eq(col, val);
	return { insert: ins.error ? "failed" : "success", delete: del.error ? "failed" : "success" };
}

async function maybeList(admin: SupabaseClient, count: number, table: string, col: string): Promise<unknown[] | undefined> {
	if (count <= 0) return undefined;
	const { data } = await admin.from(table).select(col).limit(count);
	return data as unknown[] | undefined;
}

export const GET: RequestHandler = async () => {
	const { table, searchColumn, runInsertDelete, listCount, otherEndpoints } = KEEP_ALIVE_CONFIG;
	const randomString = generateRandomString();
	const admin = getSupabaseAdmin();

	const database: { selectCount?: number; insert?: Status; delete?: Status; list?: unknown[]; error?: string } = {};

	try {
		const sel = await selectRandom(admin, table, searchColumn, randomString);
		if (sel.error) database.error = sel.error;
		else database.selectCount = sel.count;

		const id = await insertDelete(admin, runInsertDelete, table, searchColumn, randomString);
		database.insert = id.insert;
		database.delete = id.delete;

		const list = await maybeList(admin, listCount, table, searchColumn);
		if (list) database.list = list;
	} catch (e) {
		database.error = e instanceof Error ? e.message : "Unknown error";
	}

	return json({
		message: "Keep-alive executed",
		database,
		otherEndpoints: await Promise.all(otherEndpoints.map((url: string) => pingEndpoint(url))),
	}, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } });
};
