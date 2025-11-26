<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent } from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
	} from "$lib/components/ui/dialog";
	import { NewSaleDialog, RecentOrders } from "$lib/components/features";
	import { supabase } from "$lib/utils/supabase";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import type { OrderItem } from "$lib/types/database";
	import { DollarSign, Plus } from "@lucide/svelte";

	const { data } = $props();

	let showNewSaleDialog = $state(false);
	let showOpenDialog = $state(false);
	let showCloseDialog = $state(false);
	let closingName = $state("");
	let closingNotes = $state("");
	let countedCash = $state(0);
	let expectedCash = $state(0);
	let processing = $state(false);

	let cashDifference = $derived(countedCash - expectedCash);

	async function openRegister() {
		processing = true;
		try {
			const { error } = await supabase.from("register_sessions").insert({
				tenant_id: data.user.tenantId,
				facility_id: data.user.facilityId,
				opened_by: data.user.id,
			});

			if (error) throw error;
			toast.success(t("common.success"));
			showOpenDialog = false;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			processing = false;
		}
	}

	async function openCloseDialog() {
		const { data: orders } = await supabase
			.from("orders")
			.select("total_amount")
			.eq("session_id", data.activeSession?.id);

		expectedCash = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;
		countedCash = expectedCash;
		showCloseDialog = true;
	}

	async function closeRegister() {
		if (!closingName) {
			toast.error(t("common.error"));
			return;
		}

		processing = true;
		try {
			const { data: orders } = await supabase
				.from("orders")
				.select("*, order_items(*)")
				.eq("session_id", data.activeSession?.id);

			const ordersCount = orders?.length ?? 0;
			const ordersTotal = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;
			const totalDiscounts = orders?.reduce((sum, o) => sum + Number(o.discount_amount), 0) ?? 0;

			let treatCountTotal = 0;
			let treatTotalValue = 0;
			orders?.forEach((order) => {
				order.order_items?.forEach((item: OrderItem) => {
					if (item.is_treat && !item.is_deleted) {
						treatCountTotal += item.quantity;
						treatTotalValue += item.unit_price * item.quantity;
					}
				});
			});

			const { error: closingError } = await supabase.from("register_closings").insert({
				session_id: data.activeSession?.id,
				orders_count: ordersCount,
				orders_total: ordersTotal,
				treat_count: treatCountTotal,
				treat_total: treatTotalValue,
				total_discounts: totalDiscounts,
				notes: {
					closedBy: closingName,
					notes: closingNotes,
					countedCash,
					expectedCash,
					difference: countedCash - expectedCash,
				},
			});

			if (closingError) throw closingError;

			const { error: sessionError } = await supabase
				.from("register_sessions")
				.update({ closed_at: new Date().toISOString() })
				.eq("id", data.activeSession?.id);

			if (sessionError) throw sessionError;

			toast.success(t("common.success"));
			showCloseDialog = false;
			closingName = "";
			closingNotes = "";
			countedCash = 0;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			processing = false;
		}
	}

</script>

<div class="space-y-6">
	<PageHeader title={t("dashboard.title")}>
		{#snippet actions()}
			{#if data.activeSession}
				<Button onclick={() => (showNewSaleDialog = true)}>
					<Plus class="mr-2 h-4 w-4" />
					{t("orders.newSale")}
				</Button>
				<Button variant="outline" onclick={openCloseDialog}>
					{t("register.closeRegister")}
				</Button>
			{:else}
				<Button onclick={() => (showOpenDialog = true)}>
					{t("register.openRegister")}
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if !data.activeSession}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<DollarSign class="mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 text-lg font-semibold">{t("register.noActiveSession")}</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					{t("register.noSessionDescription")}
				</p>
				<Button onclick={() => (showOpenDialog = true)}>
					{t("register.openRegister")}
				</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Session Info -->
			<Card>
				<CardContent class="pt-6">
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">{t("register.openedAt")}</span>
							<span class="font-medium">{fmtDate(data.activeSession.opened_at)}</span>
						</div>
						<Separator />
						<div class="flex items-center justify-center">
							<Button size="lg" class="w-full max-w-xs" onclick={() => (showNewSaleDialog = true)}>
								<Plus class="mr-2 h-5 w-5" />
								{t("orders.newSale")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Recent Orders -->
			<RecentOrders orders={data.recentOrders} />
		</div>
	{/if}
</div>

<!-- New Sale Dialog -->
<NewSaleDialog
	bind:open={showNewSaleDialog}
	products={data.products}
	categories={data.categories}
	activeSession={data.activeSession}
	user={data.user}
/>

<!-- Open Register Dialog -->
<Dialog bind:open={showOpenDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{t("register.openRegister")}</DialogTitle>
			<DialogDescription>
				{t("register.openDescription")}
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showOpenDialog = false)}>
				{t("common.cancel")}
			</Button>
			<Button onclick={openRegister} disabled={processing}>
				{processing ? t("common.loading") : t("register.openRegister")}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Close Register Dialog -->
<Dialog bind:open={showCloseDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{t("register.closeRegister")}</DialogTitle>
			<DialogDescription>
				{t("register.closeDescription")}
			</DialogDescription>
		</DialogHeader>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="closingName">{t("common.yourName")} *</Label>
				<Input id="closingName" bind:value={closingName} required />
			</div>

			<Separator />
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>{t("register.expectedCash")}</Label>
					<div class="text-lg font-bold">{fmtCurrency(expectedCash)}</div>
				</div>
				<div class="space-y-2">
					<Label for="countedCash">{t("register.countedCash")}</Label>
					<Input
						id="countedCash"
						type="number"
						step="0.01"
						min="0"
						bind:value={countedCash}
					/>
				</div>
			</div>

			{#if cashDifference !== 0}
				<div class="rounded-lg border p-3 {cashDifference > 0 ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}">
					<div class="flex justify-between items-center">
						<span class="font-medium">{t("register.difference")}</span>
						<span class="font-bold {cashDifference > 0 ? 'text-green-600' : 'text-red-600'}">
							{cashDifference > 0 ? '+' : ''}{fmtCurrency(cashDifference)}
						</span>
					</div>
				</div>
			{/if}
			<Separator />

			<div class="space-y-2">
				<Label for="closingNotes">{t("register.closingNotes")}</Label>
				<Input id="closingNotes" bind:value={closingNotes} />
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showCloseDialog = false)}>
				{t("common.cancel")}
			</Button>
			<Button onclick={closeRegister} disabled={processing || !closingName}>
				{processing ? t("common.loading") : t("register.confirmClose")}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
