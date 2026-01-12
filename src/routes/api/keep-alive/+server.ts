import { json } from "@sveltejs/kit";
import { generateRandomString } from "$lib/server/keep-alive-helper";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const admin = getSupabaseAdmin();
	const val = generateRandomString();
	const table = "keep-alive";
	const col = "name";

	const sel = await admin.from(table).select(col).eq(col, val).limit(1);
	const ins = await admin.from(table).insert({ [col]: val });
	const del = await admin.from(table).delete().eq(col, val);
	const list = await admin.from(table).select(col).limit(1);

	return json({
		message: "Keep-alive executed",
		database: {
			selectCount: sel.data?.length ?? 0,
			insert: ins.error ? "failed" : "success",
			delete: del.error ? "failed" : "success",
			list: list.data,
			error: sel.error?.message || ins.error?.message || del.error?.message,
		},
	}, { headers: { "Cache-Control": "no-store" } });
};
