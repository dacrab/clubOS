/**
 * Supabase service layer
 * Centralizes all database operations
 */

import { supabase } from "$lib/utils/supabase";

// ============================================================================
// Products
// ============================================================================

export const products = {
	create: (data: { name: string; price: number; stock_quantity: number; facility_id: string; created_by: string; description?: string; category_id?: string; image_url?: string }) =>
		supabase.from("products").insert(data),

	update: (id: string, data: { name?: string; price?: number; stock_quantity?: number; description?: string; category_id?: string; image_url?: string }) =>
		supabase.from("products").update(data).eq("id", id),

	remove: (id: string) =>
		supabase.from("products").delete().eq("id", id),
};

// ============================================================================
// Categories
// ============================================================================

export const categories = {
	create: (data: { name: string; facility_id: string; description?: string; parent_id?: string }) =>
		supabase.from("categories").insert(data),

	update: (id: string, data: { name?: string; description?: string; parent_id?: string }) =>
		supabase.from("categories").update(data).eq("id", id),

	remove: (id: string) =>
		supabase.from("categories").delete().eq("id", id),
};

// ============================================================================
// Register Sessions
// ============================================================================

export const registerSessions = {
	open: (facilityId: string, userId: string) =>
		supabase.from("register_sessions").insert({ facility_id: facilityId, opened_by: userId }),

	close: (sessionId: string, userId: string, closingCash: number, notes?: string) =>
		supabase.rpc("close_register_session", {
			p_session_id: sessionId,
			p_user_id: userId,
			p_closing_cash: closingCash,
			p_notes: notes || null,
		}),
};

// ============================================================================
// Users (via API - requires admin)
// ============================================================================

type UserResult<T> = { data: T | null; error: unknown };

export const users = {
	create: async (data: { email: string; full_name: string; password: string; role: string }): Promise<UserResult<null>> => {
		const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
		return { data: null, error: res.ok ? null : new Error("Failed") };
	},

	update: async (id: string, data: { full_name?: string; role?: string; password?: string }): Promise<UserResult<null>> => {
		const res = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
		return { data: null, error: res.ok ? null : new Error("Failed") };
	},

	remove: async (id: string): Promise<UserResult<null>> => {
		const res = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
		return { data: null, error: res.ok ? null : new Error("Failed") };
	},
};
