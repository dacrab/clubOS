import { json, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get("authorization");
	if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
		throw error(401, "Unauthorized");
	}

	const admin = getSupabaseAdmin();
	const timestamp = new Date().toISOString();

	const { error: upsertError } = await admin
		.from("keep_alive")
		.upsert({ name: "heartbeat" }, { onConflict: "name" });

	if (upsertError) {
		throw error(500, `Keep-alive upsert failed: ${upsertError.message}`);
	}

	await admin.rpc("refresh_mv_best_sellers");

	return json({ success: true, timestamp }, { headers: { "Cache-Control": "no-store" } });
};
