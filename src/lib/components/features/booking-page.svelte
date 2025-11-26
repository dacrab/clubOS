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
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter,
	} from "$lib/components/ui/dialog";
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
	} from "$lib/components/ui/select";
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell,
	} from "$lib/components/ui/table";
	import { supabase } from "$lib/utils/supabase";
	import { DatePicker } from "$lib/components/ui/date-picker";
	import { fmtDate } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package } from "@lucide/svelte";

	type BookingType = "appointment" | "football";

	type BaseBooking = {
		id: string;
		customer_name: string;
		contact_info: string;
		notes: string | null;
		status: "confirmed" | "cancelled" | "completed";
		tenant_id: string;
		facility_id: string;
		created_by: string;
	};

	type AppointmentBooking = BaseBooking & {
		appointment_date: string;
		num_children: number;
		num_adults: number;
	};

	type FootballBooking = BaseBooking & {
		booking_datetime: string;
		field_number: number;
		num_players: number;
	};

	type Booking = AppointmentBooking | FootballBooking;

	type Props = {
		type: BookingType;
		bookings: Booking[];
		user: { id: string; tenantId: string | null; facilityId: string | null };
		icon?: typeof Package;
	};

	let { type, bookings, user, icon = Package }: Props = $props();

	const isAppointment = type === "appointment";
	const tableName = isAppointment ? "appointments" : "football_bookings";
	const dateField = isAppointment ? "appointment_date" : "booking_datetime";
	const i18nPrefix = isAppointment ? "appointments" : "football";

	let showDialog = $state(false);
	let editingItem = $state<Booking | null>(null);
	let saving = $state(false);

	// Form data with type-specific fields
	let formData = $state({
		customer_name: "",
		contact_info: "",
		datetime: "",
		notes: "",
		status: "confirmed" as Booking["status"],
		// Appointment specific
		num_children: 1,
		num_adults: 0,
		// Football specific
		field_number: 1,
		num_players: 10,
	});

	function getStatusLabel(status: string) {
		return t(`${i18nPrefix}.status.${status}`);
	}

	function getStatusBadge(status: string) {
		if (status === "confirmed") return "success" as const;
		if (status === "cancelled") return "destructive" as const;
		return "secondary" as const;
	}

	function openNewDialog() {
		editingItem = null;
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(isAppointment ? 15 : 18, 0, 0, 0);
		formData = {
			customer_name: "",
			contact_info: "",
			datetime: tomorrow.toISOString().slice(0, 16),
			notes: "",
			status: "confirmed",
			num_children: 1,
			num_adults: 0,
			field_number: 1,
			num_players: 10,
		};
		showDialog = true;
	}

	function openEditDialog(item: Booking) {
		editingItem = item;
		const datetime = isAppointment
			? (item as AppointmentBooking).appointment_date
			: (item as FootballBooking).booking_datetime;

		formData = {
			customer_name: item.customer_name,
			contact_info: item.contact_info,
			datetime: datetime.slice(0, 16),
			notes: item.notes ?? "",
			status: item.status,
			num_children: isAppointment ? (item as AppointmentBooking).num_children : 1,
			num_adults: isAppointment ? (item as AppointmentBooking).num_adults : 0,
			field_number: !isAppointment ? (item as FootballBooking).field_number : 1,
			num_players: !isAppointment ? (item as FootballBooking).num_players : 10,
		};
		showDialog = true;
	}

	async function checkConflict(): Promise<boolean> {
		const bookingTime = new Date(formData.datetime);
		const bufferMinutes = isAppointment ? settings.current.appointment_buffer_min : 120;
		const startTime = new Date(bookingTime.getTime() - bufferMinutes * 60 * 1000);
		const endTime = new Date(bookingTime.getTime() + bufferMinutes * 60 * 1000);

		let query = supabase
			.from(tableName)
			.select("id")
			.eq("facility_id", user.facilityId)
			.neq("status", "cancelled")
			.gte(dateField, startTime.toISOString())
			.lte(dateField, endTime.toISOString());

		// Football also checks field number
		if (!isAppointment) {
			query = query.eq("field_number", formData.field_number);
		}

		if (editingItem) {
			query = query.neq("id", editingItem.id);
		}

		const { data: conflicts } = await query;
		return (conflicts?.length ?? 0) > 0;
	}

	async function handleSave() {
		if (!formData.customer_name || !formData.contact_info || !formData.datetime) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			if (settings.current.prevent_overlaps) {
				const hasConflict = await checkConflict();
				if (hasConflict) {
					toast.error(t(`${i18nPrefix}.conflict`));
					saving = false;
					return;
				}
			}

			const basePayload = {
				customer_name: formData.customer_name,
				contact_info: formData.contact_info,
				notes: formData.notes || null,
				status: formData.status,
				tenant_id: user.tenantId,
				facility_id: user.facilityId,
			};

			const payload = isAppointment
				? {
						...basePayload,
						appointment_date: new Date(formData.datetime).toISOString(),
						num_children: formData.num_children,
						num_adults: formData.num_adults,
					}
				: {
						...basePayload,
						booking_datetime: new Date(formData.datetime).toISOString(),
						field_number: formData.field_number,
						num_players: formData.num_players,
					};

			if (editingItem) {
				const { error } = await supabase.from(tableName).update(payload).eq("id", editingItem.id);
				if (error) throw error;
			} else {
				const { error } = await supabase.from(tableName).insert({ ...payload, created_by: user.id });
				if (error) throw error;
			}

			toast.success(t("common.success"));
			showDialog = false;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}

	async function handleDelete(item: Booking) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", item.customer_name))) return;

		try {
			const { error } = await supabase.from(tableName).delete().eq("id", item.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}

	function getDatetime(item: Booking): string {
		return isAppointment
			? (item as AppointmentBooking).appointment_date
			: (item as FootballBooking).booking_datetime;
	}
</script>

<div class="space-y-6">
	<PageHeader title={t(`${i18nPrefix}.title`)} description={t(`${i18nPrefix}.subtitle`)}>
		{#snippet actions()}
			<Button onclick={openNewDialog}>
				<Plus class="mr-2 h-4 w-4" />
				{t(`${i18nPrefix}.${isAppointment ? "createAppointment" : "createBooking"}`)}
			</Button>
		{/snippet}
	</PageHeader>

	{#if bookings.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t(`${i18nPrefix}.empty.title`)}
					description={t(`${i18nPrefix}.empty.description`)}
					{icon}
				>
					{#snippet actions()}
						<Button onclick={openNewDialog}>
							<Plus class="mr-2 h-4 w-4" />
							{t(`${i18nPrefix}.${isAppointment ? "createAppointment" : "createBooking"}`)}
						</Button>
					{/snippet}
				</EmptyState>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("appointments.customerName")}</TableHead>
						<TableHead>{t(isAppointment ? "appointments.dateTime" : "football.bookingTime")}</TableHead>
						{#if isAppointment}
							<TableHead>{t("appointments.numChildren")}</TableHead>
						{:else}
							<TableHead>{t("football.field")}</TableHead>
							<TableHead>{t("football.numPlayers")}</TableHead>
						{/if}
						<TableHead>{t("common.status")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each bookings as item (item.id)}
						<TableRow>
							<TableCell>
								<div>
									<p class="font-medium">{item.customer_name}</p>
									<p class="text-sm text-muted-foreground">{item.contact_info}</p>
								</div>
							</TableCell>
							<TableCell>{fmtDate(getDatetime(item))}</TableCell>
							{#if isAppointment}
								{@const appt = item as AppointmentBooking}
								<TableCell>
									{t("common.kidsAndAdults").replace("{kids}", String(appt.num_children)).replace("{adults}", String(appt.num_adults))}
								</TableCell>
							{:else}
								{@const fb = item as FootballBooking}
								<TableCell>
									<Badge variant="outline">{t("common.field").replace("{number}", String(fb.field_number))}</Badge>
								</TableCell>
								<TableCell>{fb.num_players}</TableCell>
							{/if}
							<TableCell>
								<Badge variant={getStatusBadge(item.status)}>
									{t(`${i18nPrefix}.status.${item.status}`)}
								</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openEditDialog(item)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon-sm" onclick={() => handleDelete(item)}>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<!-- Dialog -->
<Dialog bind:open={showDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>
				{editingItem
					? t(`${i18nPrefix}.${isAppointment ? "editAppointment" : "editBooking"}`)
					: t(`${i18nPrefix}.${isAppointment ? "createAppointment" : "createBooking"}`)}
			</DialogTitle>
		</DialogHeader>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="name">{t("appointments.customerName")}</Label>
				<Input id="name" bind:value={formData.customer_name} required />
			</div>

			<div class="space-y-2">
				<Label for="contact">{t("appointments.contactInfo")}</Label>
				<Input id="contact" bind:value={formData.contact_info} required />
			</div>

			<div class="space-y-2">
				<Label>{t(isAppointment ? "appointments.dateTime" : "football.bookingTime")}</Label>
				<DatePicker
					bind:value={formData.datetime}
					enableTime={true}
					dateFormat="Y-m-d H:i"
					placeholder={t(isAppointment ? "appointments.dateTime" : "football.bookingTime")}
				/>
			</div>

			{#if isAppointment}
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="children">{t("appointments.numChildren")}</Label>
						<Input id="children" type="number" min="1" bind:value={formData.num_children} required />
					</div>
					<div class="space-y-2">
						<Label for="adults">{t("appointments.numAdults")}</Label>
						<Input id="adults" type="number" min="0" bind:value={formData.num_adults} />
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="field">{t("football.fieldNumber")}</Label>
						<Input id="field" type="number" min="1" max="5" bind:value={formData.field_number} required />
					</div>
					<div class="space-y-2">
						<Label for="players">{t("football.numPlayers")}</Label>
						<Input id="players" type="number" min="2" max="22" bind:value={formData.num_players} required />
					</div>
				</div>
			{/if}

			{#if editingItem}
				<div class="space-y-2">
					<Label>{t("common.status")}</Label>
					<Select bind:value={formData.status}>
						<SelectTrigger selected={getStatusLabel(formData.status)} />
						<SelectContent>
							<SelectItem value="confirmed">{t(`${i18nPrefix}.status.confirmed`)}</SelectItem>
							<SelectItem value="cancelled">{t(`${i18nPrefix}.status.cancelled`)}</SelectItem>
							<SelectItem value="completed">{t(`${i18nPrefix}.status.completed`)}</SelectItem>
						</SelectContent>
					</Select>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="notes">{t("common.notes")}</Label>
				<Textarea id="notes" bind:value={formData.notes} />
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showDialog = false)}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? t("common.loading") : t("common.save")}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
