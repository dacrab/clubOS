import { invalidateAll } from "$app/navigation";
import { supabase } from "$lib/utils/supabase";

type Result = { error: unknown };

// Products - client-side operations (RLS enforced)
export const products = {
	create: async (data: { name: string; price: number; stock_quantity: number; facility_id: string; created_by: string; description?: string; category_id?: string; image_url?: string }): Promise<Result> => {
		const { error } = await supabase.from("products").insert(data);
		if (!error) await invalidateAll();
		return { error };
	},
	update: async (id: string, data: { name?: string; price?: number; stock_quantity?: number; description?: string; category_id?: string; image_url?: string }): Promise<Result> => {
		const { error } = await supabase.from("products").update(data).eq("id", id);
		if (!error) await invalidateAll();
		return { error };
	},
	remove: async (id: string): Promise<Result> => {
		const { error } = await supabase.from("products").delete().eq("id", id);
		if (!error) await invalidateAll();
		return { error };
	},
};

// Categories - client-side operations (RLS enforced)
export const categories = {
	create: async (data: { name: string; facility_id: string; description?: string; parent_id?: string }): Promise<Result> => {
		const { error } = await supabase.from("categories").insert(data);
		if (!error) await invalidateAll();
		return { error };
	},
	update: async (id: string, data: { name?: string; description?: string; parent_id?: string }): Promise<Result> => {
		const { error } = await supabase.from("categories").update(data).eq("id", id);
		if (!error) await invalidateAll();
		return { error };
	},
	remove: async (id: string): Promise<Result> => {
		const { error } = await supabase.from("categories").delete().eq("id", id);
		if (!error) await invalidateAll();
		return { error };
	},
};

// Register Sessions - uses RPC for atomic operations
export const registerSessions = {
	open: async (facilityId: string, userId: string): Promise<Result> => {
		const { error } = await supabase.from("register_sessions").insert({ facility_id: facilityId, opened_by: userId });
		if (!error) await invalidateAll();
		return { error };
	},
	close: async (sessionId: string, userId: string, closingCash: number, notes?: string): Promise<Result> => {
		const { error } = await supabase.rpc("close_register_session", { 
			p_session_id: sessionId, 
			p_user_id: userId, 
			p_closing_cash: closingCash, 
			p_notes: notes || null 
		});
		if (!error) await invalidateAll();
		return { error };
	},
};

// Users - calls server API (requires admin privileges)
export const users = {
	create: async (data: { email: string; full_name: string; password: string; role: string }): Promise<Result> => {
		const res = await fetch("/api/admin/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (res.ok) await invalidateAll();
		return { error: res.ok ? null : await res.text() };
	},
	update: async (id: string, data: { full_name?: string; role?: string; password?: string }): Promise<Result> => {
		const res = await fetch("/api/admin/users", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, ...data }),
		});
		if (res.ok) await invalidateAll();
		return { error: res.ok ? null : await res.text() };
	},
	remove: async (id: string): Promise<Result> => {
		const res = await fetch("/api/admin/users", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		if (res.ok) await invalidateAll();
		return { error: res.ok ? null : await res.text() };
	},
};
