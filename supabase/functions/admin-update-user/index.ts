/// <reference path="../_types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../_database.types.ts";

const STATUS_OK = 200;

function getClients(req: Request) {
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!(supabaseUrl && anonKey && serviceRole)) {
		throw new Error("Missing SUPABASE env vars");
	}
	const authHeader = req.headers.get("Authorization") ?? "";
	const authedClient = createClient<Database>(supabaseUrl, anonKey, {
		global: {
			headers: {
				Authorization: authHeader,
			},
		},
	});
	const adminClient = createClient<Database>(supabaseUrl, serviceRole);
	return {
		authedClient,
		adminClient,
	};
}
async function requireAdmin(
	req: Request,
): Promise<{ status: number; error?: string; userId?: string }> {
	const { authedClient } = getClients(req);
	const { data: userData } = await authedClient.auth.getUser();
	if (!userData?.user) {
		return {
			status: 401,
			error: "Unauthorized",
		};
	}
	const { data: profile, error } = await authedClient
		.from("users")
		.select("role")
		.eq("id", userData.user.id)
		.single();
	if (error) {
		return {
			status: 400,
			error: error.message,
		};
	}
	if (profile?.role !== "admin") {
		return {
			status: 403,
			error: "Forbidden",
		};
	}
	return {
		status: 200,
		userId: userData.user.id,
	};
}

type UpdateBody = {
	id?: string;
	role?: string;
	username?: string;
	password?: string;
	active?: boolean;
	facility_ids?: string[];
};

async function updateProfile(
	adminClient: SupabaseClient<Database>,
	body: UpdateBody,
): Promise<Response | null> {
	const profileUpdates: { role?: string; username?: string } = {};
	if (body.role) {
		profileUpdates.role = body.role;
	}
	if (body.username?.trim()) {
		profileUpdates.username = body.username.trim();
	}
	if (Object.keys(profileUpdates).length) {
		const { error } = await adminClient
			.from("users")
			.update(profileUpdates)
			.eq("id", body.id as string);
		if (error) {
			return new Response(error.message, { status: 400 });
		}
	}
	return null;
}

async function updateAuth(
	adminClient: SupabaseClient<Database>,
	userId: string,
	body: UpdateBody,
): Promise<Response | null> {
	const authAttrs: {
		password?: string;
		user_metadata?: Record<string, unknown>;
	} = {};
	const userMeta: Record<string, unknown> = {};
	if (body.password?.length) {
		authAttrs.password = body.password;
	}
	if (body.role) {
		userMeta.role = body.role;
	}
	if (body.username?.trim()) {
		userMeta.username = body.username.trim();
	}
	if (typeof body.active === "boolean") {
		userMeta.active = body.active;
	}
	if (Object.keys(userMeta).length) {
		authAttrs.user_metadata = userMeta;
	}
	if (Object.keys(authAttrs).length) {
		const { error } = await adminClient.auth.admin.updateUserById(
			userId,
			authAttrs,
		);
		if (error) {
			return new Response(error.message, { status: 400 });
		}
	}
	return null;
}

async function reconcileFacilities(
	authedClient: SupabaseClient<Database>,
	adminClient: SupabaseClient<Database>,
	userId: string,
	body: UpdateBody,
): Promise<Response | null> {
	if (!Array.isArray(body.facility_ids)) {
		return null;
	}
	const { data: adminTenants } = await authedClient
		.from("tenant_members")
		.select("tenant_id");
	const adminTenantIds = new Set((adminTenants ?? []).map((t) => t.tenant_id));
	const { data: facilities, error: facErr } = await adminClient
		.from("facilities")
		.select("id, tenant_id")
		.in("id", body.facility_ids);
	if (facErr) {
		return new Response(facErr.message, { status: 400 });
	}
	const desiredFacilityIds = new Set(
		(facilities ?? [])
			.filter((f) => adminTenantIds.has(f.tenant_id))
			.map((f) => f.id),
	);
	const { data: current, error: curErr } = await adminClient
		.from("facility_members")
		.select("facility_id")
		.eq("user_id", userId);
	if (curErr) {
		return new Response(curErr.message, { status: 400 });
	}
	const currentSet = new Set((current ?? []).map((r) => r.facility_id));
	const toAdd = [...desiredFacilityIds].filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !desiredFacilityIds.has(id));
	if (toAdd.length) {
		const rows = toAdd.map((fid) => ({ facility_id: fid, user_id: userId }));
		const { error } = await adminClient.from("facility_members").insert(rows);
		if (error) {
			return new Response(error.message, { status: 400 });
		}
	}
	if (toRemove.length) {
		const { error } = await adminClient
			.from("facility_members")
			.delete()
			.eq("user_id", userId)
			.in("facility_id", toRemove);
		if (error) {
			return new Response(error.message, { status: 400 });
		}
	}
	return null;
}
Deno.serve(async (req: Request): Promise<Response> => {
	if (req.method !== "POST" && req.method !== "PATCH") {
		return new Response("Method Not Allowed", { status: 405 });
	}
	const adminCheck = await requireAdmin(req);
	if (adminCheck.status !== STATUS_OK) {
		return new Response(adminCheck.error, { status: adminCheck.status });
	}
	const body: UpdateBody = await req.json();
	if (!body?.id) {
		return new Response("Missing id", { status: 400 });
	}
	const { authedClient, adminClient } = getClients(req);
	const profileRes = await updateProfile(
		adminClient as unknown as SupabaseClient<Database>,
		body,
	);
	if (profileRes) {
		return profileRes;
	}
	const authRes = await updateAuth(
		adminClient as unknown as SupabaseClient<Database>,
		body.id as string,
		body,
	);
	if (authRes) {
		return authRes;
	}
	const facRes = await reconcileFacilities(
		authedClient as unknown as SupabaseClient<Database>,
		adminClient as unknown as SupabaseClient<Database>,
		body.id as string,
		body,
	);
	if (facRes) {
		return facRes;
	}
	return new Response(null, { status: 204 });
});
