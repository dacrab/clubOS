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
	import { Plus, Pencil, Trash2, Cake } from "@lucide/svelte";
	import type { Appointment } from "$lib/types/database";

	const { data } = $props();

	let showDialog = $state(false);
	let editingItem = $state<Appointment | null>(null);
	let formData = $state({
		customer_name: "",
		contact_info: "",
		appointment_date: "",
		num_children: 1,
		num_adults: 0,
		notes: "",
		status: "confirmed" as Appointment["status"],
	});
	let saving = $state(false);

	function getStatusLabel(status: string) {
		const labels: Record<string, string> = {
			confirmed: t("appointments.status.confirmed"),
			cancelled: t("appointments.status.cancelled"),
			completed: t("appointments.status.completed"),
		};
		return labels[status] || status;
	}

	function openNewDialog() {
		editingItem = null;
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(15, 0, 0, 0);
		formData = {
			customer_name: "",
			contact_info: "",
			appointment_date: tomorrow.toISOString().slice(0, 16),
			num_children: 1,
			num_adults: 0,
			notes: "",
			status: "confirmed",
		};
		showDialog = true;
	}

	function openEditDialog(item: Appointment) {
		editingItem = item;
		formData = {
			customer_name: item.customer_name,
			contact_info: item.contact_info,
			appointment_date: item.appointment_date.slice(0, 16),
			num_children: item.num_children,
			num_adults: item.num_adults,
			notes: item.notes ?? "",
			status: item.status,
		};
		showDialog = true;
	}

	async function checkConflict(): Promise<boolean> {
		const appointmentTime = new Date(formData.appointment_date);
		const bufferMinutes = settings.current.appointment_buffer_min;
		const startBuffer = new Date(appointmentTime.getTime() - bufferMinutes * 60 * 1000);
		const endBuffer = new Date(appointmentTime.getTime() + bufferMinutes * 60 * 1000);

		let query = supabase
			.from("appointments")
			.select("id")
			.eq("facility_id", data.user.facilityId)
			.neq("status", "cancelled")
			.gte("appointment_date", startBuffer.toISOString())
			.lte("appointment_date", endBuffer.toISOString());

		if (editingItem) {
			query = query.neq("id", editingItem.id);
		}

		const { data: conflicts } = await query;
		return (conflicts?.length ?? 0) > 0;
	}

	async function handleSave() {
		if (!formData.customer_name || !formData.contact_info || !formData.appointment_date) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			if (settings.current.prevent_overlaps) {
				const hasConflict = await checkConflict();
				if (hasConflict) {
					toast.error(t("appointments.conflict"));
					saving = false;
					return;
				}
			}

			const payload = {
				customer_name: formData.customer_name,
				contact_info: formData.contact_info,
				appointment_date: new Date(formData.appointment_date).toISOString(),
				num_children: formData.num_children,
				num_adults: formData.num_adults,
				notes: formData.notes || null,
				status: formData.status,
				tenant_id: data.user.tenantId,
				facility_id: data.user.facilityId,
			};

			if (editingItem) {
				const { error } = await supabase
					.from("appointments")
					.update(payload)
					.eq("id", editingItem.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("appointments")
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

	async function handleDelete(item: Appointment) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", item.customer_name))) return;

		try {
			const { error } = await supabase.from("appointments").delete().eq("id", item.id);
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
	<PageHeader title={t("appointments.title")} description={t("appointments.subtitle")}>
		{#snippet actions()}
			<Button onclick={openNewDialog}>
				<Plus class="mr-2 h-4 w-4" />
				{t("appointments.createAppointment")}
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.appointments.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t("appointments.empty.title")}
					description={t("appointments.empty.description")}
					icon={Cake}
				>
					{#snippet actions()}
						<Button onclick={openNewDialog}>
							<Plus class="mr-2 h-4 w-4" />
							{t("appointments.createAppointment")}
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
						<TableHead>{t("appointments.dateTime")}</TableHead>
						<TableHead>{t("appointments.numChildren")}</TableHead>
						<TableHead>{t("common.status")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.appointments as item (item.id)}
						<TableRow>
							<TableCell>
								<div>
									<p class="font-medium">{item.customer_name}</p>
									<p class="text-sm text-muted-foreground">{item.contact_info}</p>
								</div>
							</TableCell>
							<TableCell>{fmtDate(item.appointment_date)}</TableCell>
							<TableCell>
								{t("common.kidsAndAdults").replace("{kids}", String(item.num_children)).replace("{adults}", String(item.num_adults))}
							</TableCell>
							<TableCell>
								<Badge variant={getStatusBadge(item.status)}>
									{t(`appointments.status.${item.status}`)}
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
				{editingItem ? t("appointments.editAppointment") : t("appointments.createAppointment")}
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
				<Label>{t("appointments.dateTime")}</Label>
				<DatePicker
					bind:value={formData.appointment_date}
					enableTime={true}
					dateFormat="Y-m-d H:i"
					placeholder={t("appointments.dateTime")}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="children">{t("appointments.numChildren")}</Label>
					<Input
						id="children"
						type="number"
						min="1"
						bind:value={formData.num_children}
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="adults">{t("appointments.numAdults")}</Label>
					<Input
						id="adults"
						type="number"
						min="0"
						bind:value={formData.num_adults}
					/>
				</div>
			</div>

			{#if editingItem}
				<div class="space-y-2">
					<Label>{t("common.status")}</Label>
					<Select bind:value={formData.status}>
						<SelectTrigger selected={getStatusLabel(formData.status)} />
						<SelectContent>
							<SelectItem value="confirmed">{t("appointments.status.confirmed")}</SelectItem>
							<SelectItem value="cancelled">{t("appointments.status.cancelled")}</SelectItem>
							<SelectItem value="completed">{t("appointments.status.completed")}</SelectItem>
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
