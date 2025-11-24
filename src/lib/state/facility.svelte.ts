import { supabase } from "$lib/utils/supabase";

export type Facility = { id: string; name: string };

class FacilityState {
	selectedId = $state<string | null>(null);
	list = $state<Facility[]>([]);

	// Resolve a valid selected facility for current user
	async resolveSelected(): Promise<string | null> {
		const { data: sessionData } = await supabase.auth.getSession();
		const uid = sessionData.session?.user.id ?? "";
		if (!uid) return null;

		let saved: string | null = null;
		try {
			if (typeof window !== "undefined") {
				saved = window.localStorage.getItem("selected-facility");
			}
		} catch {}

		let selected: string | null = null;
		if (saved) {
			const { data: fm } = await supabase
				.from("facility_members")
				.select("facility_id")
				.eq("user_id", uid)
				.eq("facility_id", saved)
				.limit(1)
				.maybeSingle();
			if (fm?.facility_id) selected = fm.facility_id as string;
		}

		if (!selected) {
			const { data: fms } = await supabase
				.from("facility_members")
				.select("facility_id")
				.eq("user_id", uid)
				.order("facility_id")
				.limit(1);
			selected = (fms?.[0]?.facility_id as string | undefined) ?? null;
		}

		if (!selected) {
			const { data: tm } = await supabase
				.from("tenant_members")
				.select("tenant_id")
				.eq("user_id", uid)
				.limit(1);
			const tenantId = (tm?.[0]?.tenant_id as string | undefined) ?? null;
			if (tenantId) {
				const { data: facs } = await supabase
					.from("facilities")
					.select("id")
					.eq("tenant_id", tenantId)
					.order("name")
					.limit(1);
				selected = (facs?.[0]?.id as string | undefined) ?? null;
			}
		}

		try {
			if (typeof window !== "undefined") {
				if (selected)
					window.localStorage.setItem("selected-facility", selected);
				else window.localStorage.removeItem("selected-facility");
			}
		} catch {}

		this.selectedId = selected;
		return selected;
	}

	async loadList(): Promise<void> {
		const { data: sessionData } = await supabase.auth.getSession();
		const uid = sessionData.session?.user.id ?? "";
		if (!uid) {
			this.list = [];
			return;
		}
		const { data: fms } = await supabase
			.from("facility_members")
			.select("facility_id")
			.eq("user_id", uid);
		const ids = (fms ?? []).map((r: { facility_id: string }) => r.facility_id);
		let data: Facility[] | null = null;
		if (ids.length > 0) {
			const res = await supabase
				.from("facilities")
				.select("id,name")
				.in("id", ids)
				.order("name");
			data = (res.data as Facility[] | null) ?? [];
		} else {
			const { data: tm } = await supabase
				.from("tenant_members")
				.select("tenant_id")
				.eq("user_id", uid)
				.limit(1)
				.maybeSingle();
			const tenantId = (tm as { tenant_id?: string } | null)?.tenant_id;
			if (tenantId) {
				const res = await supabase
					.from("facilities")
					.select("id,name")
					.eq("tenant_id", tenantId)
					.order("name");
				data = (res.data as Facility[] | null) ?? [];
			}
		}
		this.list = data ?? [];
	}
}

export const facilityState = new FacilityState();
