/**
 * Register session helpers for opening, checking, and closing POS register sessions.
 * These functions interact with Supabase tables and RPC to manage sessions.
 */
import { supabase } from "$lib/utils/supabase";
import { facilityState } from "./facility.svelte";

class RegisterState {
	async getOpenSession(userId: string): Promise<string | null> {
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", userId);
		const tenantId = memberships?.[0]?.tenant_id;

		// Ensure facility is resolved
		let facilityId = facilityState.selectedId;
		if (!facilityId) {
			facilityId = await facilityState.resolveSelected();
		}

		let query = supabase
			.from("register_sessions")
			.select("id, closed_at")
			.eq("tenant_id", tenantId)
			.order("opened_at", { ascending: false })
			.limit(1);
		if (facilityId) query = query.eq("facility_id", facilityId);
		const { data, error } = await query;
		if (error) {
			return null;
		}
		const latest = data?.[0];
		if (latest && !latest.closed_at) {
			return latest.id as string;
		}
		return null;
	}

	async ensureOpenSession(userId: string): Promise<string> {
		const existing = await this.getOpenSession(userId);
		if (existing) {
			return existing;
		}
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", userId);
		const tenantId = memberships?.[0]?.tenant_id;

		let facilityId = facilityState.selectedId;
		if (!facilityId) {
			facilityId = await facilityState.resolveSelected();
		}

		const { data, error } = await supabase
			.from("register_sessions")
			.insert({
				opened_by: userId,
				tenant_id: tenantId,
				facility_id: facilityId,
			})
			.select()
			.single();
		if (error) {
			throw error;
		}
		return (data as unknown as { id: string }).id as string;
	}

	async close(sessionId: string, notes: Record<string, unknown> | null = null): Promise<string> {
		const { data, error } = await supabase.rpc("close_register_session", {
			p_session_id: sessionId,
			p_notes: notes,
		});
		if (error) {
			throw error;
		}
		return (data as string) ?? "";
	}
}

export const registerState = new RegisterState();
