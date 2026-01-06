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
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "$lib/components/ui/dialog";
	import { NewSaleDialog, RecentOrders } from "$lib/components/features";
	import { registerSessions } from "$lib/services/db";
	import { supabase } from "$lib/utils/supabase";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
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

	const cashDifference = $derived(countedCash - expectedCash);

	async function openRegister(): Promise<void> {
		if (!data.user.facilityId) return;
		processing = true;
		const { error } = await registerSessions.open(data.user.facilityId, data.user.id);
		processing = false;
		if (error) { toast.error(t("common.error")); return; }
		toast.success(t("common.success"));
		showOpenDialog = false;
		await invalidateAll();
	}

	async function openCloseDialog(): Promise<void> {
		const { data: orders } = await supabase.from("orders").select("total_amount").eq("session_id", data.activeSession?.id);
		expectedCash = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;
		countedCash = expectedCash;
		showCloseDialog = true;
	}

	async function closeRegister(): Promise<void> {
		if (!closingName || !data.activeSession) { toast.error(t("common.error")); return; }
		processing = true;
		const { error } = await registerSessions.close(data.activeSession.id, {
			closed_by: data.user.id,
			closing_cash: countedCash,
			expected_cash: expectedCash,
			notes: closingNotes || undefined,
		});
		processing = false;
		if (error) { toast.error(t("common.error")); return; }
		toast.success(t("common.success"));
		showCloseDialog = false;
		closingName = "";
		closingNotes = "";
		countedCash = 0;
		await invalidateAll();
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("dashboard.title")}>
		{#snippet actions()}
			{#if data.activeSession}
				<Button onclick={() => showNewSaleDialog = true}><Plus class="mr-2 h-4 w-4" />{t("orders.newSale")}</Button>
				<Button variant="outline" onclick={openCloseDialog}>{t("register.closeRegister")}</Button>
			{:else}
				<Button onclick={() => showOpenDialog = true}>{t("register.openRegister")}</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if !data.activeSession}
		<Card><CardContent class="flex flex-col items-center justify-center py-12">
			<DollarSign class="mb-4 h-12 w-12 text-muted-foreground" />
			<h3 class="mb-2 text-lg font-semibold">{t("register.noActiveSession")}</h3>
			<p class="mb-4 text-sm text-muted-foreground">{t("register.noSessionDescription")}</p>
			<Button onclick={() => showOpenDialog = true}>{t("register.openRegister")}</Button>
		</CardContent></Card>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<Card><CardContent class="pt-6 space-y-4">
				<div class="flex items-center justify-between"><span class="text-sm text-muted-foreground">{t("register.openedAt")}</span><span class="font-medium">{fmtDate(data.activeSession.opened_at)}</span></div>
				<Separator />
				<div class="flex items-center justify-center"><Button size="lg" class="w-full max-w-xs" onclick={() => showNewSaleDialog = true}><Plus class="mr-2 h-5 w-5" />{t("orders.newSale")}</Button></div>
			</CardContent></Card>
			<RecentOrders orders={data.recentOrders} />
		</div>
	{/if}
</div>

<NewSaleDialog bind:open={showNewSaleDialog} products={data.products} categories={data.categories} activeSession={data.activeSession} user={data.user} />

<Dialog bind:open={showOpenDialog}>
	<DialogContent>
		<DialogHeader><DialogTitle>{t("register.openRegister")}</DialogTitle><DialogDescription>{t("register.openDescription")}</DialogDescription></DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={() => showOpenDialog = false}>{t("common.cancel")}</Button>
			<Button onclick={openRegister} disabled={processing}>{processing ? t("common.loading") : t("register.openRegister")}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<Dialog bind:open={showCloseDialog}>
	<DialogContent>
		<DialogHeader><DialogTitle>{t("register.closeRegister")}</DialogTitle><DialogDescription>{t("register.closeDescription")}</DialogDescription></DialogHeader>
		<div class="space-y-4 py-4">
			<div class="space-y-2"><Label for="closingName">{t("common.yourName")} *</Label><Input id="closingName" bind:value={closingName} required /></div>
			<Separator />
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label>{t("register.expectedCash")}</Label><div class="text-lg font-bold">{fmtCurrency(expectedCash)}</div></div>
				<div class="space-y-2"><Label for="countedCash">{t("register.countedCash")}</Label><Input id="countedCash" type="number" step="0.01" min="0" bind:value={countedCash} /></div>
			</div>
			{#if cashDifference !== 0}
				<div class="rounded-lg border p-3 {cashDifference > 0 ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-red-50 dark:bg-red-950 border-red-200'}">
					<div class="flex justify-between items-center"><span class="font-medium">{t("register.difference")}</span><span class="font-bold {cashDifference > 0 ? 'text-green-600' : 'text-red-600'}">{cashDifference > 0 ? '+' : ''}{fmtCurrency(cashDifference)}</span></div>
				</div>
			{/if}
			<Separator />
			<div class="space-y-2"><Label for="closingNotes">{t("register.closingNotes")}</Label><Input id="closingNotes" bind:value={closingNotes} /></div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => showCloseDialog = false}>{t("common.cancel")}</Button>
			<Button onclick={closeRegister} disabled={processing || !closingName}>{processing ? t("common.loading") : t("register.confirmClose")}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
