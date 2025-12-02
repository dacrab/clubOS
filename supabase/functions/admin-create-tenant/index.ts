/// <reference path="../_types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../_database.types.ts";

function getClients(req: Request) {
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceRole = Deno.env.get("SUPABASE_SECRET_KEY");
	if (!(supabaseUrl && anonKey && serviceRole)) {
		return { error: new Response("Missing Supabase env", { status: 500 }) };
	}
	const authHeader = req.headers.get("Authorization") ?? "";
	const authedClient = createClient<Database>(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } },
	});
	const adminClient = createClient<Database>(supabaseUrl, serviceRole);
	return { authedClient, adminClient };
}
async function requireAdmin(req: Request): Promise<Response> {
	const { authedClient, error } = getClients(req);
	if (error) {
		return error;
	}
	const { data: userData } = await authedClient.auth.getUser();
	if (!userData?.user) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { data: profile, error: profErr } = await authedClient
		.from("users")
		.select("id, role")
		.eq("id", userData.user.id)
		.single();
	if (profErr) {
		return new Response(profErr.message, { status: 400 });
	}
	if (profile?.role !== "admin") {
		return new Response("Forbidden", { status: 403 });
	}
	return new Response(null, { status: 200 });
}
Deno.serve(async (req: Request): Promise<Response> => {
	if (req.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}
	const adminCheck = await requireAdmin(req);
	const STATUS_OK = 200;
	if (adminCheck.status !== STATUS_OK) {
		return adminCheck;
	}
	const { authedClient, adminClient, error } = getClients(req);
	if (error) {
		return error;
	}
	const body = await req.json().catch(() => null);
	const tenantName = body?.name?.trim();
	const facilityName = (body?.facility_name ?? "Main Facility").trim();
	if (!tenantName) {
		return new Response("Missing tenant name", { status: 400 });
	}
	const { data: userData } = await authedClient.auth.getUser();
	const userId = userData?.user?.id;
	if (!userId) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { data: existingTenant } = await adminClient
		.from("tenants")
		.select("id")
		.ilike("name", tenantName)
		.limit(1)
		.maybeSingle();
	let tenantId = existingTenant?.id;
	if (!tenantId) {
		const { data, error: tErr } = await adminClient
			.from("tenants")
			.insert({ name: tenantName })
			.select("id")
			.single();
		if (tErr) {
			return new Response(tErr.message, { status: 400 });
		}
		tenantId = data.id;
	}
	const { error: tmErr } = await adminClient
		.from("tenant_members")
		.upsert({ tenant_id: tenantId, user_id: userId }, { onConflict: "tenant_id,user_id" });
	if (tmErr) {
		return new Response(tmErr.message, { status: 400 });
	}
	const { data: existingFacility } = await adminClient
		.from("facilities")
		.select("id, name")
		.eq("tenant_id", tenantId)
		.ilike("name", facilityName)
		.limit(1)
		.maybeSingle();
	let facilityId = existingFacility?.id;
	if (!facilityId) {
		const { data, error: fErr } = await adminClient
			.from("facilities")
			.insert({ tenant_id: tenantId, name: facilityName })
			.select("id")
			.single();
		if (fErr) {
			return new Response(fErr.message, { status: 400 });
		}
		facilityId = data.id;
	}
	const { error: fmErr } = await adminClient
		.from("facility_members")
		.upsert({ facility_id: facilityId, user_id: userId }, { onConflict: "facility_id,user_id" });
	if (fmErr) {
		return new Response(fmErr.message, { status: 400 });
	}
	return Response.json({ tenant_id: tenantId, facility_id: facilityId });
});
