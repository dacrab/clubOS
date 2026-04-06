import { invalidateAll } from "$app/navigation";
import { supabase } from "$lib/utils/supabase";

type Result = { error: unknown };

const dbOp = async (op: () => PromiseLike<{ error: unknown }>): Promise<Result> => {
	const { error } = await op();
	if (!error) await invalidateAll();
	return { error };
};

const apiOp = async (method: string, body: unknown): Promise<Result> => {
	const res = await fetch("/api/admin/users", {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (res.ok) await invalidateAll();
	return { error: res.ok ? null : await res.text() };
};

export const products = {
	create: (data: { name: string; price: number; stock_quantity: number; facility_id: string; created_by: string; description?: string; category_id?: string; image_url?: string }) =>
		dbOp(() => supabase.from("products").insert(data)),
	update: (id: string, data: { name?: string; price?: number; stock_quantity?: number; description?: string; category_id?: string; image_url?: string }) =>
		dbOp(() => supabase.from("products").update(data).eq("id", id)),
	remove: (id: string) =>
		dbOp(() => supabase.from("products").delete().eq("id", id)),
};

export const categories = {
	create: (data: { name: string; facility_id: string; description?: string; parent_id?: string }) =>
		dbOp(() => supabase.from("categories").insert(data)),
	update: (id: string, data: { name?: string; description?: string; parent_id?: string }) =>
		dbOp(() => supabase.from("categories").update(data).eq("id", id)),
	remove: (id: string) =>
		dbOp(() => supabase.from("categories").delete().eq("id", id)),
};

export const registerSessions = {
	open: (facilityId: string, userId: string) =>
		dbOp(() => supabase.from("register_sessions").insert({ facility_id: facilityId, opened_by: userId })),
	close: (sessionId: string, userId: string, closingCash: number, notes?: string) =>
		dbOp(() => supabase.rpc("close_register_session", {
			p_session_id: sessionId,
			p_user_id: userId,
			p_closing_cash: closingCash,
			p_notes: notes ?? null,
		})),
};

export const users = {
	create: (data: { email: string; full_name: string; password: string; role: string }) =>
		apiOp("POST", data),
	update: (id: string, data: { full_name?: string; role?: string; password?: string }) =>
		apiOp("PUT", { id, ...data }),
	remove: (id: string) =>
		apiOp("DELETE", { id }),
};
