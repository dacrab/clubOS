import { invalidateAll } from "$app/navigation";
import { supabase } from "$lib/utils/supabase";

type Result = { error: unknown };

// Generic helper: run a supabase op, invalidate on success
async function dbOp(op: () => PromiseLike<{ error: unknown }>): Promise<Result> {
	const { error } = await op();
	if (!error) await invalidateAll();
	return { error };
}

// Generic helper: call admin API, invalidate on success
async function apiOp(method: string, body: unknown): Promise<Result> {
	const res = await fetch("/api/admin/users", {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (res.ok) await invalidateAll();
	return { error: res.ok ? null : await res.text() };
}

// Products - client-side operations (RLS enforced)
export const products = {
	create: (data: { name: string; price: number; stock_quantity: number; facility_id: string; created_by: string; description?: string; category_id?: string; image_url?: string }): Promise<Result> =>
		dbOp(() => supabase.from("products").insert(data)),
	update: (id: string, data: { name?: string; price?: number; stock_quantity?: number; description?: string; category_id?: string; image_url?: string }): Promise<Result> =>
		dbOp(() => supabase.from("products").update(data).eq("id", id)),
	remove: (id: string): Promise<Result> =>
		dbOp(() => supabase.from("products").delete().eq("id", id)),
};

// Categories - client-side operations (RLS enforced)
export const categories = {
	create: (data: { name: string; facility_id: string; description?: string; parent_id?: string }): Promise<Result> =>
		dbOp(() => supabase.from("categories").insert(data)),
	update: (id: string, data: { name?: string; description?: string; parent_id?: string }): Promise<Result> =>
		dbOp(() => supabase.from("categories").update(data).eq("id", id)),
	remove: (id: string): Promise<Result> =>
		dbOp(() => supabase.from("categories").delete().eq("id", id)),
};

// Register Sessions - uses RPC for atomic operations
export const registerSessions = {
	open: (facilityId: string, userId: string): Promise<Result> =>
		dbOp(() => supabase.from("register_sessions").insert({ facility_id: facilityId, opened_by: userId })),
	close: (sessionId: string, userId: string, closingCash: number, notes?: string): Promise<Result> =>
		dbOp(() => supabase.rpc("close_register_session", {
			p_session_id: sessionId,
			p_user_id: userId,
			p_closing_cash: closingCash,
			p_notes: notes ?? null,
		})),
};

// Users - calls server API (requires admin privileges)
export const users = {
	create: (data: { email: string; full_name: string; password: string; role: string }): Promise<Result> =>
		apiOp("POST", data),
	update: (id: string, data: { full_name?: string; role?: string; password?: string }): Promise<Result> =>
		apiOp("PUT", { id, ...data }),
	remove: (id: string): Promise<Result> =>
		apiOp("DELETE", { id }),
};
