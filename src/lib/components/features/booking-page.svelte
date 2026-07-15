<script lang="ts">
import { Package, Pencil, Plus, Trash2 } from "@lucide/svelte";
import { toast } from "svelte-sonner";
import EmptyState from "$lib/components/layout/empty-state.svelte";
import PageHeader from "$lib/components/layout/page-header.svelte";
import Badge from "$lib/components/ui/badge/badge.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card, { CardContent } from "$lib/components/ui/card/card.svelte";
import ConfirmDelete from "$lib/components/ui/confirm-delete/confirm-delete.svelte";
import DatePicker from "$lib/components/ui/date-picker/date-time-picker.svelte";
import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import Pagination from "$lib/components/ui/pagination/pagination.svelte";
import Select from "$lib/components/ui/select/select.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
import Table, {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table/table.svelte";
import Textarea from "$lib/components/ui/textarea/textarea.svelte";
import { t } from "$lib/i18n/index.svelte";
import { settings } from "$lib/state/settings.svelte";
import type { Booking, BookingDetails, BookingStatus, BookingType } from "$lib/types/database";
import { runCrud } from "$lib/utils/crud";
import { fmtDate, formatDateTimeLocal, tomorrowAt } from "$lib/utils/format";
import { getBookingStatusBadgeVariant } from "$lib/utils/helpers";
import { supabase } from "$lib/utils/supabase";

type Props = {
	type: BookingType;
	bookings: Booking[];
	user: { id: string; tenantId: string | null; facilityId: string | null };
	icon?: typeof Package;
	page?: number;
	totalPages?: number;
	search?: string;
};

let {
	type,
	bookings,
	user,
	icon = Package,
	page = 1,
	totalPages = 1,
	search = "",
}: Props = $props();

const isBirthday = $derived(type === "birthday");
const prefix = $derived(isBirthday ? "bookings.birthday" : "bookings.football");

// Sensible booking defaults (not exposed in settings UI)
const DEFAULT_HOUR = { birthday: 15, football: 18 } as const;
const FOOTBALL_PLAYERS = { default: 10, min: 2, max: 22 } as const;

let showDialog = $state(false);
let editingItem = $state<Booking | null>(null);
let saving = $state(false);
type FormData = {
	customer_name: string;
	customer_phone: string;
	customer_email: string;
	starts_at: string;
	notes: string;
	status: BookingStatus;
	num_children: number;
	num_adults: number;
	field_number: string;
	num_players: number;
};
let formData = $state<FormData>({
	customer_name: "",
	customer_phone: "",
	customer_email: "",
	starts_at: "",
	notes: "",
	status: "confirmed",
	num_children: 1,
	num_adults: 0,
	field_number: "1",
	num_players: FOOTBALL_PLAYERS.default,
});

function openDialog(item?: Booking) {
	editingItem = item ?? null;
	if (item) {
		const details = item.details ?? {};
		formData = {
			customer_name: item.customer_name,
			customer_phone: item.customer_phone ?? "",
			customer_email: item.customer_email ?? "",
			starts_at: item.starts_at.slice(0, 16),
			notes: item.notes ?? "",
			status: item.status,
			num_children: details.num_children ?? 1,
			num_adults: details.num_adults ?? 0,
			field_number: details.field_number ?? "1",
			num_players: details.num_players ?? FOOTBALL_PLAYERS.default,
		};
	} else {
		const defaultHour = isBirthday ? DEFAULT_HOUR.birthday : DEFAULT_HOUR.football;
		const startsAt = formatDateTimeLocal(tomorrowAt(defaultHour));
		formData = {
			customer_name: "",
			customer_phone: "",
			customer_email: "",
			starts_at: startsAt,
			notes: "",
			status: "confirmed",
			num_children: 1,
			num_adults: 0,
			field_number: "1",
			num_players: FOOTBALL_PLAYERS.default,
		};
	}
	showDialog = true;
}

async function checkConflict(startsAt: Date, endsAt: Date): Promise<boolean> {
	// Use the authoritative server-side RPC (Postgres OVERLAPS). The previous
	// client-side SELECT with a ±buffer window could disagree with the server
	// and let overlapping bookings through.
	const { data } = await supabase.rpc("check_booking_conflict", {
		p_facility_id: user.facilityId,
		p_type: type,
		p_starts_at: startsAt.toISOString(),
		p_ends_at: endsAt.toISOString(),
		...(editingItem ? { p_exclude_id: editingItem.id } : {}),
	});
	return Boolean(data);
}

async function handleSave(): Promise<void> {
	if (!formData.customer_name || !formData.customer_phone || !formData.starts_at) {
		toast.error(t("common.error"));
		return;
	}
	saving = true;
	try {
		const startsAt = new Date(formData.starts_at);
		const durationMin = isBirthday
			? settings.current.birthday_duration_min
			: settings.current.football_duration_min;
		const endsAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);

		if (settings.current.prevent_overlaps && (await checkConflict(startsAt, endsAt))) {
			toast.error(t(`${prefix}.conflict`));
			return;
		}

		const details: BookingDetails = isBirthday
			? { num_children: formData.num_children, num_adults: formData.num_adults }
			: { field_number: formData.field_number, num_players: formData.num_players };

		const payload = {
			facility_id: user.facilityId,
			type,
			customer_name: formData.customer_name,
			customer_phone: formData.customer_phone,
			customer_email: formData.customer_email || null,
			starts_at: startsAt.toISOString(),
			ends_at: endsAt.toISOString(),
			status: formData.status,
			notes: formData.notes || null,
			details,
		};

		let newId: string | null = null;
		const ok = await runCrud(async () => {
			if (editingItem) {
				return supabase.from("bookings").update(payload).eq("id", editingItem.id);
			}
			const { data, error: err } = await supabase
				.from("bookings")
				.insert({ ...payload, created_by: user.id })
				.select("id");
			newId = data?.[0]?.id ?? null;
			return { error: err };
		});
		if (ok) {
			showDialog = false;
			if (newId && payload.customer_email) {
				fetch("/api/booking/confirm", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ id: newId }),
				}).catch((err) => {
					// biome-ignore lint/suspicious/noConsole: intentional error logging for email failures
					console.error("Failed to send booking confirmation email", err);
				});
			}
		}
	} finally {
		saving = false;
	}
}

let deleteTarget = $state<Booking | null>(null);
let deleteOpen = $state(false);

async function confirmDelete(): Promise<void> {
	if (!deleteTarget) return;
	const target = deleteTarget;
	const ok = await runCrud(() => supabase.from("bookings").delete().eq("id", target.id));
	if (ok) deleteOpen = false;
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

	<form method="GET" class="max-w-sm">
		<Input name="search" placeholder={t("common.search")} value={search} />
	</form>

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
								<Badge variant={getBookingStatusBadgeVariant(item.status)}>{t(`bookings.status.${item.status}`)}</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openDialog(item)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon-sm" onclick={() => { deleteTarget = item; deleteOpen = true; }}>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
		<Pagination {page} {totalPages} />
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
		<Label for="email">Email</Label>
		<Input id="email" type="email" bind:value={formData.customer_email} placeholder="customer@example.com" />
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
				<Input id="players" type="number" min={FOOTBALL_PLAYERS.min} max={FOOTBALL_PLAYERS.max} bind:value={formData.num_players} required />
			</div>
		</div>
	{/if}
	{#if editingItem}
		<div class="space-y-2">
			<Label>{t("common.status")}</Label>
			<Select bind:value={formData.status}>
				<SelectTrigger selected={t(`bookings.status.${formData.status}`)} />
				<SelectContent>
					{#each ["pending", "confirmed", "canceled", "completed", "no_show"] as status (status)}
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

<ConfirmDelete bind:open={deleteOpen} name={deleteTarget?.customer_name ?? ""} onconfirm={confirmDelete} oncancel={() => deleteOpen = false} />
