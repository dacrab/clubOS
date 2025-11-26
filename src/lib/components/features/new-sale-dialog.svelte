<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
	import { supabase } from "$lib/utils/supabase";
	import { fmtCurrency } from "$lib/utils/format";
	import { settings as globalSettings } from "$lib/state/settings.svelte";
	import { ShoppingCart, Plus, Minus, Gift, X, Search, Check } from "@lucide/svelte";
	import type { Product } from "$lib/types/database";

	type Category = { id: string; name: string; parent_id: string | null };
	type CartItem = { product: Product; quantity: number; isTreat: boolean };
	type Props = {
		open: boolean;
		products: Product[];
		categories?: Category[];
		activeSession: { id: string } | null;
		user: { id: string; tenantId: string | null; facilityId: string | null };
		onOpenChange?: (open: boolean) => void;
	};

	let { open = $bindable(), products, categories = [], activeSession, user, onOpenChange }: Props = $props();

	let selectedCategory = $state<string | null>(null);
	let cart = $state<CartItem[]>([]);
	let couponCount = $state(0);
	let searchQuery = $state("");
	let processing = $state(false);
	let lastOrderId = $state<string | null>(null);

	const COUPON_VALUE = $derived(globalSettings.current.coupons_value);
	const rootCategories = $derived(categories.filter(c => !c.parent_id));

	function getCategoryDescendants(id: string): Set<string> {
		const result = new Set([id]);
		for (const c of categories.filter(c => c.parent_id === id)) {
			getCategoryDescendants(c.id).forEach(d => result.add(d));
		}
		return result;
	}

	const filteredProducts = $derived.by(() => {
		const q = searchQuery.toLowerCase();
		return products.filter(p => {
			if (!p.name.toLowerCase().includes(q)) return false;
			if (!selectedCategory) return true;
			return p.category_id && getCategoryDescendants(selectedCategory).has(p.category_id);
		});
	});

	const subtotal = $derived(cart.reduce((s, i) => s + (i.isTreat ? 0 : i.product.price * i.quantity), 0));
	const discount = $derived(couponCount * COUPON_VALUE);
	const total = $derived(Math.max(0, subtotal - discount));
	const treatCount = $derived(cart.reduce((s, i) => s + (i.isTreat ? i.quantity : 0), 0));
	const cartItemCount = $derived(cart.reduce((s, i) => s + i.quantity, 0));

	function addToCart(product: Product) {
		const existing = cart.find(i => i.product.id === product.id && !i.isTreat);
		if (existing) existing.quantity++;
		else cart.push({ product, quantity: 1, isTreat: false });
		cart = [...cart];
		lastOrderId = null;
	}

	function updateQuantity(idx: number, delta: number) {
		cart[idx].quantity += delta;
		cart = cart[idx].quantity <= 0 ? cart.filter((_, i) => i !== idx) : [...cart];
	}

	function toggleTreat(idx: number) {
		cart[idx].isTreat = !cart[idx].isTreat;
		cart = [...cart];
	}

	function clearCart() {
		cart = [];
		couponCount = 0;
		lastOrderId = null;
	}

	async function submitOrder() {
		if (!cart.length) return toast.error(t("orders.emptyCart"));
		if (!activeSession) return toast.error(t("register.noActiveSession"));

		processing = true;
		try {
			const { data: order, error: orderError } = await supabase
				.from("orders")
				.insert({
					tenant_id: user.tenantId,
					facility_id: user.facilityId,
					session_id: activeSession.id,
					subtotal,
					discount_amount: discount,
					total_amount: total,
					coupon_count: couponCount,
					created_by: user.id,
				})
				.select()
				.single();
			if (orderError) throw orderError;

			const { error: itemsError } = await supabase.from("order_items").insert(
				cart.map(i => ({
					order_id: order.id,
					product_id: i.product.id,
					quantity: i.quantity,
					unit_price: i.product.price,
					line_total: i.isTreat ? 0 : i.product.price * i.quantity,
					is_treat: i.isTreat,
				}))
			);
			if (itemsError) throw itemsError;

			await Promise.all(
				cart.filter(i => i.product.stock_quantity >= 0).map(i =>
					supabase.from("products").update({ stock_quantity: i.product.stock_quantity - i.quantity }).eq("id", i.product.id)
				)
			);

			lastOrderId = order.id;
			toast.success(t("common.success"));
			clearCart();
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			processing = false;
		}
	}
</script>

<Dialog bind:open {onOpenChange}>
	<DialogContent class="max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0 [&>button]:hidden">
		<DialogHeader class="px-6 py-4 border-b shrink-0">
			<div class="flex items-center justify-between">
				<DialogTitle class="text-xl flex items-center gap-2">
					<ShoppingCart class="h-6 w-6" />
					{t("orders.newSale")}
				</DialogTitle>
				<Button variant="ghost" size="icon" onclick={() => { open = false; onOpenChange?.(false); }}>
					<X class="h-5 w-5" />
				</Button>
			</div>
		</DialogHeader>

		<div class="flex-1 flex overflow-hidden">
			<!-- Products -->
			<div class="flex-1 flex flex-col overflow-hidden border-r">
				<div class="p-4 border-b shrink-0">
					<div class="relative">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input placeholder={t("common.search")} class="pl-10" bind:value={searchQuery} />
					</div>
				</div>

				{#if categories.length > 0}
					<div class="p-3 border-b shrink-0 overflow-x-auto">
						<div class="flex gap-2">
							<Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onclick={() => selectedCategory = null}>
								{t("common.viewAll")}
							</Button>
							{#each rootCategories as cat (cat.id)}
								<Button variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onclick={() => selectedCategory = cat.id}>
									{cat.name}
								</Button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex-1 overflow-y-auto p-4">
					<div class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{#each filteredProducts as product (product.id)}
							<button
								class="flex flex-col items-start rounded-lg border bg-card p-3 text-left transition-all hover:bg-accent hover:shadow-md active:scale-[0.98]"
								onclick={() => addToCart(product)}
							>
								<span class="font-medium line-clamp-2">{product.name}</span>
								<span class="text-sm text-primary font-semibold mt-1">{fmtCurrency(product.price)}</span>
								{#if product.stock_quantity >= 0}
									<Badge variant="outline" class="mt-2 text-xs">{product.stock_quantity} {t("common.stock").toLowerCase()}</Badge>
								{/if}
							</button>
						{:else}
							<div class="col-span-full text-center py-12 text-muted-foreground">{t("common.noResults")}</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Cart -->
			<div class="w-80 lg:w-96 flex flex-col bg-muted/30">
				<div class="p-4 border-b bg-background">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold flex items-center gap-2">
							<ShoppingCart class="h-4 w-4" />
							{t("orders.cart")}
							{#if cartItemCount > 0}<Badge variant="secondary">{cartItemCount}</Badge>{/if}
						</h3>
						{#if cart.length > 0}
							<Button variant="ghost" size="sm" onclick={clearCart}>{t("common.clear")}</Button>
						{/if}
					</div>
				</div>

				<div class="flex-1 overflow-y-auto p-4 space-y-2">
					{#if cart.length === 0}
						<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
							<ShoppingCart class="h-12 w-12 mb-2 opacity-50" />
							<p class="text-sm">{t("orders.emptyCart")}</p>
						</div>
					{:else}
						{#each cart as item, idx (item.product.id + (item.isTreat ? '-t' : '') + idx)}
							<div class="flex items-center gap-2 rounded-lg border bg-background p-2">
								<div class="flex-1 min-w-0">
									<p class="font-medium text-sm truncate">{item.product.name}</p>
									{#if item.isTreat}
										<Badge variant="secondary" class="text-xs"><Gift class="h-3 w-3 mr-1" />{t("orders.treat")}</Badge>
									{:else}
										<span class="text-sm text-muted-foreground">{fmtCurrency(item.product.price * item.quantity)}</span>
									{/if}
								</div>
								<div class="flex items-center gap-1 shrink-0">
									<Button variant="outline" size="icon-sm" onclick={() => updateQuantity(idx, -1)}><Minus class="h-3 w-3" /></Button>
									<span class="w-8 text-center text-sm font-medium">{item.quantity}</span>
									<Button variant="outline" size="icon-sm" onclick={() => updateQuantity(idx, 1)}><Plus class="h-3 w-3" /></Button>
									<Button variant={item.isTreat ? "default" : "ghost"} size="icon-sm" onclick={() => toggleTreat(idx)}><Gift class="h-3 w-3" /></Button>
									<Button variant="ghost" size="icon-sm" onclick={() => { cart = cart.filter((_, i) => i !== idx); }}><X class="h-3 w-3" /></Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				{#if cart.length > 0}
					<div class="p-4 border-t bg-background space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">{t("orders.coupons")}</span>
							<div class="flex items-center gap-2">
								<Button variant="outline" size="icon-sm" onclick={() => couponCount = Math.max(0, couponCount - 1)} disabled={couponCount === 0}><Minus class="h-3 w-3" /></Button>
								<span class="w-8 text-center font-medium">{couponCount}</span>
								<Button variant="outline" size="icon-sm" onclick={() => couponCount++}><Plus class="h-3 w-3" /></Button>
							</div>
						</div>
						<Separator />
						<div class="space-y-1 text-sm">
							<div class="flex justify-between"><span>{t("orders.subtotal")}</span><span>{fmtCurrency(subtotal)}</span></div>
							{#if discount > 0}<div class="flex justify-between text-green-600"><span>{t("orders.discount")}</span><span>-{fmtCurrency(discount)}</span></div>{/if}
							{#if treatCount > 0}<div class="flex justify-between text-muted-foreground"><span>{t("orders.treats")}</span><span>{treatCount} {t("common.items")}</span></div>{/if}
						</div>
						<Separator />
						<div class="flex justify-between text-xl font-bold"><span>{t("orders.total")}</span><span>{fmtCurrency(total)}</span></div>
						<Button class="w-full h-12 text-lg" onclick={submitOrder} disabled={processing || !activeSession}>
							{#if processing}{t("common.loading")}{:else}<Check class="h-5 w-5 mr-2" />{t("orders.submitOrder")} - {fmtCurrency(total)}{/if}
						</Button>
						{#if !activeSession}<p class="text-xs text-center text-destructive">{t("register.noActiveSession")}</p>{/if}
					</div>
				{/if}

				{#if lastOrderId}
					<div class="p-4 bg-green-50 dark:bg-green-950 border-t border-green-200 dark:border-green-800">
						<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
							<Check class="h-5 w-5" /><span class="font-medium">{t("common.success")}</span><span class="text-sm">#{lastOrderId.slice(0, 8)}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</DialogContent>
</Dialog>
