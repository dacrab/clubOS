<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import Textarea from "$lib/components/ui/textarea/textarea.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Card, CardContent } from "$lib/components/ui/card";
	import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { supabase } from "$lib/utils/supabase";
	import DatePicker from "$lib/components/ui/date-picker/date-time-picker.svelte";
	import { fmtDate } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package } from "@lucide/svelte";
	import type { Booking, BookingStatus, BookingType, BookingDetails } from "$lib/types/database";
	import { BOOKING_STATUS, BOOKING_TYPE, type BookingTypeValue } from "$lib/constants";

	type Props = {
		type: BookingTypeValue;
		bookings: Booking[];
		user: { id: string; tenantId: string | null; facilityId: string | null };
		icon?: typeof Package;
	};

	let { type, bookings, user, icon = Package }: Props = $props();

	const isBirthday = $derived(type === BOOKING_TYPE.BIRTHDAY);
	const prefix = $derived(isBirthday ? "bookings.birthday" : "bookings.football");

	let showDialog = $state(false);
	let editingItem = $state<Booking | null>(null);
	let saving = $state(false);
	let formData = $state({
		customer_name: "",
		customer_phone: "",
		starts_at: "",
		notes: "",
		status: BOOKING_STATUS.CONFIRMED as BookingStatus,
		num_children: 1,
		num_adults: 0,
		field_number: "1",
		num_players: settings.current.football_default_players,
	});

	const getStatusBadge = (s: BookingStatus) =>
		s === BOOKING_STATUS.CONFIRMED ? ("success" as const) : s === BOOKING_STATUS.CANCELED ? ("destructive" as const) : ("secondary" as const);

	function openDialog(item?: Booking) {
		editingItem = item ?? null;
		if (item) {
			const details = item.details ?? {};
			formData = {
				customer_name: item.customer_name,
				customer_phone: item.customer_phone ?? "",
				starts_at: item.starts_at.slice(0, 16),
				notes: item.notes ?? "",
				status: item.status,
				num_children: details.num_children ?? 1,
				num_adults: details.num_adults ?? 0,
				field_number: details.field_number ?? "1",
				num_players: details.num_players ?? 10,
			};
		} else {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const defaultHour = isBirthday ? settings.current.birthday_default_hour : settings.current.football_default_hour;
			tomorrow.setHours(defaultHour, 0, 0, 0);
			formData = {
				customer_name: "",
				customer_phone: "",
				starts_at: tomorrow.toISOString().slice(0, 16),
				notes: "",
				status: BOOKING_STATUS.CONFIRMED,
				num_children: 1,
				num_adults: 0,
				field_number: "1",
				num_players: settings.current.football_default_players,
			};
		}
		showDialog = true;
	}

	async function checkConflict(): Promise<boolean> {
		const time = new Date(formData.starts_at);
		const buffer = isBirthday ? settings.current.appointment_buffer_min : 120;
		let query = supabase
			.from("bookings")
			.select("id")
			.eq("facility_id", user.facilityId)
			.eq("type", type)
			.neq("status", BOOKING_STATUS.CANCELED)
			.gte("starts_at", new Date(time.getTime() - buffer * 60000).toISOString())
			.lte("starts_at", new Date(time.getTime() + buffer * 60000).toISOString());

		if (editingItem) query = query.neq("id", editingItem.id);
		const { data } = await query;
		return (data?.length ?? 0) > 0;
	}

	async function handleSave(): Promise<void> {
		if (!formData.customer_name || !formData.customer_phone || !formData.starts_at) {
			toast.error(t("common.error")); return;
		}
		saving = true;
		try {
			if (settings.current.prevent_overlaps && (await checkConflict())) {
				saving = false;
				toast.error(t(`${prefix}.conflict`)); return;
			}

			const startsAt = new Date(formData.starts_at);
			const durationMin = isBirthday ? settings.current.birthday_duration_min : settings.current.football_duration_min;
			const endsAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);

			const details: BookingDetails = isBirthday
				? { num_children: formData.num_children, num_adults: formData.num_adults }
				: { field_number: formData.field_number, num_players: formData.num_players };

			const payload = {
				facility_id: user.facilityId,
				type: type as BookingType,
				customer_name: formData.customer_name,
				customer_phone: formData.customer_phone,
				starts_at: startsAt.toISOString(),
				ends_at: endsAt.toISOString(),
				status: formData.status,
				notes: formData.notes || null,
				details,
			};

			const { error } = editingItem
				? await supabase.from("bookings").update(payload).eq("id", editingItem.id)
				: await supabase.from("bookings").insert({ ...payload, created_by: user.id });

			if (error) throw error;
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
			const { error } = await supabase.from("bookings").delete().eq("id", item.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}
</script>

<div class="space-y-6">
	<PageHeader title={t(`${prefix}.title`)} description={t(`${prefix}.subtitle`)}>
		{#snippet actions()}
			<Button onclick={() => openDialog()}>
				<Plus class="mr-2 h-4 w-4" />{t(`${prefix}.create`)}
			</Button>
		{/snippet}
	</PageHeader>

	{#if bookings.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState title={t(`${prefix}.empty.title`)} description={t(`${prefix}.empty.description`)} {icon}>
					{#snippet actions()}
						<Button onclick={() => openDialog()}>
							<Plus class="mr-2 h-4 w-4" />{t(`${prefix}.create`)}
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
						<TableHead>{t("bookings.customerName")}</TableHead>
						<TableHead>{t("bookings.dateTime")}</TableHead>
						{#if isBirthday}
							<TableHead>{t("bookings.birthday.guests")}</TableHead>
						{:else}
							<TableHead>{t("bookings.football.field")}</TableHead>
							<TableHead>{t("bookings.football.players")}</TableHead>
						{/if}
						<TableHead>{t("common.status")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each bookings as item (item.id)}
						{@const details = item.details ?? {}}
						<TableRow>
							<TableCell>
								<p class="font-medium">{item.customer_name}</p>
								<p class="text-sm text-muted-foreground">{item.customer_phone}</p>
							</TableCell>
							<TableCell>{fmtDate(item.starts_at)}</TableCell>
							{#if isBirthday}
								<TableCell>
									{t("common.kidsAndAdults")
										.replace("{kids}", String(details.num_children ?? 0))
										.replace("{adults}", String(details.num_adults ?? 0))}
								</TableCell>
							{:else}
								<TableCell>
									<Badge variant="outline">{t("common.field").replace("{number}", String(details.field_number ?? 1))}</Badge>
								</TableCell>
								<TableCell>{details.num_players ?? 0}</TableCell>
							{/if}
							<TableCell>
								<Badge variant={getStatusBadge(item.status)}>{t(`bookings.status.${item.status}`)}</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openDialog(item)}>
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

<FormDialog bind:open={showDialog} title={editingItem ? t(`${prefix}.edit`) : t(`${prefix}.create`)} {saving} onsubmit={handleSave} onclose={() => showDialog = false}>
	<div class="space-y-2">
		<Label for="name">{t("bookings.customerName")}</Label>
		<Input id="name" bind:value={formData.customer_name} required />
	</div>
	<div class="space-y-2">
		<Label for="phone">{t("bookings.customerPhone")}</Label>
		<Input id="phone" bind:value={formData.customer_phone} required />
	</div>
	<div class="space-y-2">
		<Label>{t("bookings.dateTime")}</Label>
		<DatePicker bind:value={formData.starts_at} enableTime={true} />
	</div>
	{#if isBirthday}
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="children">{t("bookings.birthday.numChildren")}</Label>
				<Input id="children" type="number" min="1" bind:value={formData.num_children} required />
			</div>
			<div class="space-y-2">
				<Label for="adults">{t("bookings.birthday.numAdults")}</Label>
				<Input id="adults" type="number" min="0" bind:value={formData.num_adults} />
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="field">{t("bookings.football.fieldNumber")}</Label>
				<Input id="field" type="number" min="1" max={settings.current.football_fields_count} bind:value={formData.field_number} required />
			</div>
			<div class="space-y-2">
				<Label for="players">{t("bookings.football.numPlayers")}</Label>
				<Input id="players" type="number" min={settings.current.football_min_players} max={settings.current.football_max_players} bind:value={formData.num_players} required />
			</div>
		</div>
	{/if}
	{#if editingItem}
		<div class="space-y-2">
			<Label>{t("common.status")}</Label>
			<Select bind:value={formData.status}>
				<SelectTrigger selected={t(`bookings.status.${formData.status}`)} />
				<SelectContent>
					{#each Object.values(BOOKING_STATUS) as status (status)}
						<SelectItem value={status}>{t(`bookings.status.${status}`)}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
	{/if}
	<div class="space-y-2">
		<Label for="notes">{t("common.notes")}</Label>
		<Textarea id="notes" bind:value={formData.notes} />
	</div>
</FormDialog>
