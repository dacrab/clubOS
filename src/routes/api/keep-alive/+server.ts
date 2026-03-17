import { json, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

/**
 * Keep-alive endpoint to prevent Supabase free tier from pausing due to inactivity.
 * Supabase pauses projects after 7 days of no activity, so this should run at least
 * every few days. We run it every 12 hours to be safe.
 *
 * The endpoint performs a simple upsert + select cycle on the keep_alive table
 * to ensure the database stays active.
 */
export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get("authorization");
	if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
		throw error(401, "Unauthorized");
	}

	const admin = getSupabaseAdmin();
	const timestamp = new Date().toISOString();

	// Upsert to avoid accumulating rows — always updates the same "heartbeat" row
	const { error: upsertError } = await admin
		.from("keep_alive")
		.upsert({ name: "heartbeat" }, { onConflict: "name" });

	if (upsertError) {
		throw error(500, `Keep-alive upsert failed: ${upsertError.message}`);
	}

	return json(
		{
			success: true,
			message: "Keep-alive executed successfully",
			timestamp,
		},
		{ headers: { "Cache-Control": "no-store" } }
	);
};
