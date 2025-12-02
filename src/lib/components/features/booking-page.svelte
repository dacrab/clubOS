<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Badge } from "$lib/components/ui/badge";
	import { Card, CardContent } from "$lib/components/ui/card";
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "$lib/components/ui/dialog";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { supabase } from "$lib/utils/supabase";
	import { DatePicker } from "$lib/components/ui/date-picker";
	import { fmtDate } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package } from "@lucide/svelte";

	type BookingType = "appointment" | "football";
	type Status = "confirmed" | "cancelled" | "completed";
	type BaseBooking = { id: string; customer_name: string; contact_info: string; notes: string | null; status: Status; tenant_id: string; facility_id: string; created_by: string };
	type AppointmentBooking = BaseBooking & { appointment_date: string; num_children: number; num_adults: number };
	type FootballBooking = BaseBooking & { booking_datetime: string; field_number: number; num_players: number };
	type Booking = AppointmentBooking | FootballBooking;
	type Props = { type: BookingType; bookings: Booking[]; user: { id: string; tenantId: string | null; facilityId: string | null }; icon?: typeof Package };

	let { type, bookings, user, icon = Package }: Props = $props();

	const isAppt = $derived(type === "appointment");
	const table = $derived(isAppt ? "appointments" : "football_bookings");
	const dateField = $derived(isAppt ? "appointment_date" : "booking_datetime");
	const prefix = $derived(isAppt ? "appointments" : "football");

	let showDialog = $state(false);
	let editingItem = $state<Booking | null>(null);
	let saving = $state(false);
	let formData = $state({ customer_name: "", contact_info: "", datetime: "", notes: "", status: "confirmed" as Status, num_children: 1, num_adults: 0, field_number: 1, num_players: 10 });

	const getStatusBadge = (s: string) => s === "confirmed" ? "success" as const : s === "cancelled" ? "destructive" as const : "secondary" as const;
	const getDatetime = (item: Booking) => isAppt ? (item as AppointmentBooking).appointment_date : (item as FootballBooking).booking_datetime;

	function openDialog(item?: Booking) {
		editingItem = item ?? null;
		if (item) {
			const dt = getDatetime(item);
			formData = {
				customer_name: item.customer_name, contact_info: item.contact_info, datetime: dt.slice(0, 16), notes: item.notes ?? "", status: item.status,
				num_children: isAppt ? (item as AppointmentBooking).num_children : 1, num_adults: isAppt ? (item as AppointmentBooking).num_adults : 0,
				field_number: !isAppt ? (item as FootballBooking).field_number : 1, num_players: !isAppt ? (item as FootballBooking).num_players : 10,
			};
		} else {
			const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(isAppt ? 15 : 18, 0, 0, 0);
			formData = { customer_name: "", contact_info: "", datetime: tomorrow.toISOString().slice(0, 16), notes: "", status: "confirmed", num_children: 1, num_adults: 0, field_number: 1, num_players: 10 };
		}
		showDialog = true;
	}

	async function checkConflict(): Promise<boolean> {
		const time = new Date(formData.datetime);
		const buffer = isAppt ? settings.current.appointment_buffer_min : 120;
		let query = supabase.from(table).select("id").eq("facility_id", user.facilityId).neq("status", "cancelled")
			.gte(dateField, new Date(time.getTime() - buffer * 60000).toISOString())
			.lte(dateField, new Date(time.getTime() + buffer * 60000).toISOString());
		if (!isAppt) query = query.eq("field_number", formData.field_number);
		if (editingItem) query = query.neq("id", editingItem.id);
		const { data } = await query;
		return (data?.length ?? 0) > 0;
	}

	async function handleSave() {
		if (!formData.customer_name || !formData.contact_info || !formData.datetime) return toast.error(t("common.error"));
		saving = true;
		try {
			if (settings.current.prevent_overlaps && await checkConflict()) { saving = false; return toast.error(t(`${prefix}.conflict`)); }
			const base = { customer_name: formData.customer_name, contact_info: formData.contact_info, notes: formData.notes || null, status: formData.status, tenant_id: user.tenantId, facility_id: user.facilityId };
			const payload = isAppt
				? { ...base, appointment_date: new Date(formData.datetime).toISOString(), num_children: formData.num_children, num_adults: formData.num_adults }
				: { ...base, booking_datetime: new Date(formData.datetime).toISOString(), field_number: formData.field_number, num_players: formData.num_players };
			const { error } = editingItem ? await supabase.from(table).update(payload).eq("id", editingItem.id) : await supabase.from(table).insert({ ...payload, created_by: user.id });
			if (error) throw error;
			toast.success(t("common.success")); showDialog = false; await invalidateAll();
		} catch { toast.error(t("common.error")); } finally { saving = false; }
	}

	async function handleDelete(item: Booking) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", item.customer_name))) return;
		try { const { error } = await supabase.from(table).delete().eq("id", item.id); if (error) throw error; toast.success(t("common.success")); await invalidateAll(); }
		catch { toast.error(t("common.error")); }
	}
</script>

<div class="space-y-6">
	<PageHeader title={t(`${prefix}.title`)} description={t(`${prefix}.subtitle`)}>
		{#snippet actions()}<Button onclick={() => openDialog()}><Plus class="mr-2 h-4 w-4" />{t(`${prefix}.${isAppt ? "createAppointment" : "createBooking"}`)}</Button>{/snippet}
	</PageHeader>

	{#if bookings.length === 0}
		<Card><CardContent class="pt-6">
			<EmptyState title={t(`${prefix}.empty.title`)} description={t(`${prefix}.empty.description`)} {icon}>
				{#snippet actions()}<Button onclick={() => openDialog()}><Plus class="mr-2 h-4 w-4" />{t(`${prefix}.${isAppt ? "createAppointment" : "createBooking"}`)}</Button>{/snippet}
			</EmptyState>
		</CardContent></Card>
	{:else}
		<Card><Table>
			<TableHeader><TableRow>
				<TableHead>{t("appointments.customerName")}</TableHead>
				<TableHead>{t(isAppt ? "appointments.dateTime" : "football.bookingTime")}</TableHead>
				{#if isAppt}<TableHead>{t("appointments.numChildren")}</TableHead>{:else}<TableHead>{t("football.field")}</TableHead><TableHead>{t("football.numPlayers")}</TableHead>{/if}
				<TableHead>{t("common.status")}</TableHead>
				<TableHead class="w-24">{t("common.actions")}</TableHead>
			</TableRow></TableHeader>
			<TableBody>
				{#each bookings as item (item.id)}
					<TableRow>
						<TableCell><p class="font-medium">{item.customer_name}</p><p class="text-sm text-muted-foreground">{item.contact_info}</p></TableCell>
						<TableCell>{fmtDate(getDatetime(item))}</TableCell>
						{#if isAppt}{@const a = item as AppointmentBooking}<TableCell>{t("common.kidsAndAdults").replace("{kids}", String(a.num_children)).replace("{adults}", String(a.num_adults))}</TableCell>
						{:else}{@const f = item as FootballBooking}<TableCell><Badge variant="outline">{t("common.field").replace("{number}", String(f.field_number))}</Badge></TableCell><TableCell>{f.num_players}</TableCell>{/if}
						<TableCell><Badge variant={getStatusBadge(item.status)}>{t(`${prefix}.status.${item.status}`)}</Badge></TableCell>
						<TableCell><div class="flex items-center gap-1">
							<Button variant="ghost" size="icon-sm" onclick={() => openDialog(item)}><Pencil class="h-4 w-4" /></Button>
							<Button variant="ghost" size="icon-sm" onclick={() => handleDelete(item)}><Trash2 class="h-4 w-4" /></Button>
						</div></TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table></Card>
	{/if}
</div>

<Dialog bind:open={showDialog}>
	<DialogContent>
		<DialogHeader><DialogTitle>{editingItem ? t(`${prefix}.${isAppt ? "editAppointment" : "editBooking"}`) : t(`${prefix}.${isAppt ? "createAppointment" : "createBooking"}`)}</DialogTitle></DialogHeader>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2"><Label for="name">{t("appointments.customerName")}</Label><Input id="name" bind:value={formData.customer_name} required /></div>
			<div class="space-y-2"><Label for="contact">{t("appointments.contactInfo")}</Label><Input id="contact" bind:value={formData.contact_info} required /></div>
			<div class="space-y-2"><Label>{t(isAppt ? "appointments.dateTime" : "football.bookingTime")}</Label><DatePicker bind:value={formData.datetime} enableTime={true} dateFormat="Y-m-d H:i" /></div>
			{#if isAppt}
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2"><Label for="children">{t("appointments.numChildren")}</Label><Input id="children" type="number" min="1" bind:value={formData.num_children} required /></div>
					<div class="space-y-2"><Label for="adults">{t("appointments.numAdults")}</Label><Input id="adults" type="number" min="0" bind:value={formData.num_adults} /></div>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2"><Label for="field">{t("football.fieldNumber")}</Label><Input id="field" type="number" min="1" max="5" bind:value={formData.field_number} required /></div>
					<div class="space-y-2"><Label for="players">{t("football.numPlayers")}</Label><Input id="players" type="number" min="2" max="22" bind:value={formData.num_players} required /></div>
				</div>
			{/if}
			{#if editingItem}
				<div class="space-y-2"><Label>{t("common.status")}</Label>
					<Select bind:value={formData.status}><SelectTrigger selected={t(`${prefix}.status.${formData.status}`)} /><SelectContent>
						<SelectItem value="confirmed">{t(`${prefix}.status.confirmed`)}</SelectItem>
						<SelectItem value="cancelled">{t(`${prefix}.status.cancelled`)}</SelectItem>
						<SelectItem value="completed">{t(`${prefix}.status.completed`)}</SelectItem>
					</SelectContent></Select>
				</div>
			{/if}
			<div class="space-y-2"><Label for="notes">{t("common.notes")}</Label><Textarea id="notes" bind:value={formData.notes} /></div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => showDialog = false}>{t("common.cancel")}</Button>
				<Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
