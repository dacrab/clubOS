import { supabase } from "$lib/utils/supabase";

export const products = {
	create: async (data: { name: string; price: number; stock_quantity: number; facility_id: string; created_by: string; description?: string; category_id?: string; image_url?: string }) =>
		await supabase.from("products").insert(data),
	update: async (id: string, data: { name?: string; price?: number; stock_quantity?: number; description?: string; category_id?: string; image_url?: string }) =>
		await supabase.from("products").update(data).eq("id", id),
	remove: async (id: string) => await supabase.from("products").delete().eq("id", id),
};

export const categories = {
	create: async (data: { name: string; facility_id: string; description?: string; parent_id?: string }) =>
		await supabase.from("categories").insert(data),
	update: async (id: string, data: { name?: string; description?: string; parent_id?: string }) =>
		await supabase.from("categories").update(data).eq("id", id),
	remove: async (id: string) => await supabase.from("categories").delete().eq("id", id),
};

export const registerSessions = {
	open: async (facilityId: string, userId: string) =>
		await supabase.from("register_sessions").insert({ facility_id: facilityId, opened_by: userId }),
	close: async (sessionId: string, userId: string, closingCash: number, notes?: string) =>
		await supabase.rpc("close_register_session", { p_session_id: sessionId, p_user_id: userId, p_closing_cash: closingCash, p_notes: notes || null }),
};

export const users = {
	create: async (data: { email: string; full_name: string; password: string; role: string }) =>
		await supabase.auth.admin.createUser({ email: data.email, password: data.password, user_metadata: { full_name: data.full_name, role: data.role } }),
	update: async (id: string, data: { full_name?: string; role?: string; password?: string }) =>
		await supabase.auth.admin.updateUserById(id, { user_metadata: { full_name: data.full_name, role: data.role }, ...(data.password && { password: data.password }) }),
	remove: async (id: string) => await supabase.auth.admin.deleteUser(id),
};
