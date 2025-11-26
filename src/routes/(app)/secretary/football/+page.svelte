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
	import { Plus, Pencil, Trash2, Dribbble } from "@lucide/svelte";
	import type { FootballBooking } from "$lib/types/database";

	const { data } = $props();

	let showDialog = $state(false);
	let editingItem = $state<FootballBooking | null>(null);
	let formData = $state({
		customer_name: "",
		contact_info: "",
		booking_datetime: "",
		field_number: 1,
		num_players: 10,
		notes: "",
		status: "confirmed" as FootballBooking["status"],
	});
	let saving = $state(false);

	function getStatusLabel(status: string) {
		const labels: Record<string, string> = {
			confirmed: t("football.status.confirmed"),
			cancelled: t("football.status.cancelled"),
			completed: t("football.status.completed"),
		};
		return labels[status] || status;
	}

	function openNewDialog() {
		editingItem = null;
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(18, 0, 0, 0);
		formData = {
			customer_name: "",
			contact_info: "",
			booking_datetime: tomorrow.toISOString().slice(0, 16),
			field_number: 1,
			num_players: 10,
			notes: "",
			status: "confirmed",
		};
		showDialog = true;
	}

	function openEditDialog(item: FootballBooking) {
		editingItem = item;
		formData = {
			customer_name: item.customer_name,
			contact_info: item.contact_info,
			booking_datetime: item.booking_datetime.slice(0, 16),
			field_number: item.field_number,
			num_players: item.num_players,
			notes: item.notes ?? "",
			status: item.status,
		};
		showDialog = true;
	}

	async function checkConflict(): Promise<boolean> {
		const bookingTime = new Date(formData.booking_datetime);
		const durationMinutes = 120; // 2 hours default for football
		const startTime = new Date(bookingTime.getTime() - durationMinutes * 60 * 1000);
		const endTime = new Date(bookingTime.getTime() + durationMinutes * 60 * 1000);

		let query = supabase
			.from("football_bookings")
			.select("id")
			.eq("facility_id", data.user.facilityId)
			.eq("field_number", formData.field_number)
			.neq("status", "cancelled")
			.gte("booking_datetime", startTime.toISOString())
			.lte("booking_datetime", endTime.toISOString());

		if (editingItem) {
			query = query.neq("id", editingItem.id);
		}

		const { data: conflicts } = await query;
		return (conflicts?.length ?? 0) > 0;
	}

	async function handleSave() {
		if (!formData.customer_name || !formData.contact_info || !formData.booking_datetime) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			// Check for conflicts if prevention is enabled
			if (settings.current.prevent_overlaps) {
				const hasConflict = await checkConflict();
				if (hasConflict) {
					toast.error(t("football.conflict"));
					saving = false;
					return;
				}
			}

			const payload = {
				customer_name: formData.customer_name,
				contact_info: formData.contact_info,
				booking_datetime: new Date(formData.booking_datetime).toISOString(),
				field_number: formData.field_number,
				num_players: formData.num_players,
				notes: formData.notes || null,
				status: formData.status,
				tenant_id: data.user.tenantId,
				facility_id: data.user.facilityId,
			};

			if (editingItem) {
				const { error } = await supabase
					.from("football_bookings")
					.update(payload)
					.eq("id", editingItem.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("football_bookings")
					.insert({ ...payload, created_by: data.user.id });
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

	async function handleDelete(item: FootballBooking) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", item.customer_name))) return;

		try {
			const { error } = await supabase.from("football_bookings").delete().eq("id", item.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}

	function getStatusBadge(status: string) {
		if (status === "confirmed") return "success" as const;
		if (status === "cancelled") return "destructive" as const;
		return "secondary" as const;
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("football.title")} description={t("football.subtitle")}>
		{#snippet actions()}
			<Button onclick={openNewDialog}>
				<Plus class="mr-2 h-4 w-4" />
				{t("football.createBooking")}
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.bookings.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t("football.empty.title")}
					description={t("football.empty.description")}
					icon={Dribbble}
				>
					{#snippet actions()}
						<Button onclick={openNewDialog}>
							<Plus class="mr-2 h-4 w-4" />
							{t("football.createBooking")}
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
						<TableHead>{t("football.bookingTime")}</TableHead>
						<TableHead>{t("football.field")}</TableHead>
						<TableHead>{t("football.numPlayers")}</TableHead>
						<TableHead>{t("common.status")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.bookings as item (item.id)}
						<TableRow>
							<TableCell>
								<div>
									<p class="font-medium">{item.customer_name}</p>
									<p class="text-sm text-muted-foreground">{item.contact_info}</p>
								</div>
							</TableCell>
							<TableCell>{fmtDate(item.booking_datetime)}</TableCell>
							<TableCell>
								<Badge variant="outline">{t("common.field").replace("{number}", String(item.field_number))}</Badge>
							</TableCell>
							<TableCell>{item.num_players}</TableCell>
							<TableCell>
								<Badge variant={getStatusBadge(item.status)}>
									{t(`football.status.${item.status}`)}
								</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => openEditDialog(item)}
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => handleDelete(item)}
									>
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
				{editingItem ? t("football.editBooking") : t("football.createBooking")}
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
				<Label>{t("football.bookingTime")}</Label>
				<DatePicker
					bind:value={formData.booking_datetime}
					enableTime={true}
					dateFormat="Y-m-d H:i"
					placeholder={t("football.bookingTime")}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="field">{t("football.fieldNumber")}</Label>
					<Input
						id="field"
						type="number"
						min="1"
						max="5"
						bind:value={formData.field_number}
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="players">{t("football.numPlayers")}</Label>
					<Input
						id="players"
						type="number"
						min="2"
						max="12"
						bind:value={formData.num_players}
						required
					/>
				</div>
			</div>

			{#if editingItem}
				<div class="space-y-2">
					<Label>{t("common.status")}</Label>
					<Select bind:value={formData.status}>
						<SelectTrigger selected={getStatusLabel(formData.status)} />
						<SelectContent>
							<SelectItem value="confirmed">{t("football.status.confirmed")}</SelectItem>
							<SelectItem value="cancelled">{t("football.status.cancelled")}</SelectItem>
							<SelectItem value="completed">{t("football.status.completed")}</SelectItem>
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
