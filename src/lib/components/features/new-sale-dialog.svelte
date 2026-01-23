<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import Input from "$lib/components/ui/input/input.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Dialog, DialogContent } from "$lib/components/ui/dialog";
	import { supabase } from "$lib/utils/supabase";
	import { fmtCurrency } from "$lib/utils/format";
	import { printReceipt, type ReceiptData } from "$lib/utils/receipt";
	import { settings as globalSettings } from "$lib/state/settings.svelte";
	import { ShoppingCart, Plus, Minus, Gift, X, Search, Check, Trash2, ChevronRight, Tag, Printer } from "@lucide/svelte";
	import type { Product, CartItem } from "$lib/types/database";

	type Category = { id: string; name: string; parent_id: string | null };
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
	let submitDebounce = $state<ReturnType<typeof setTimeout> | null>(null);
	let lastOrderId = $state<string | null>(null);
	let lastOrderData = $state<ReceiptData | null>(null);
	let showCart = $state(false);

	function handlePrintReceipt(): void {
		if (lastOrderData) printReceipt(lastOrderData);
	}

	const COUPON_VALUE = $derived(globalSettings.current.coupons_value);
	const rootCategories = $derived(categories.filter(c => !c.parent_id));

	// Use DB full-text search when query exists, otherwise filter by category client-side
	let searchResults = $state<Product[]>([]);

	async function searchProducts(query: string) {
		if (!query.trim() || !user.facilityId) {
			searchResults = [];
			return;
		}
		const { data } = await supabase.rpc("search_products", { facility_uuid: user.facilityId, search_text: query });
		searchResults = (data as Product[]) ?? [];
	}

	// Debounced search
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (searchTimeout) clearTimeout(searchTimeout);
		if (searchQuery.trim()) {
			searchTimeout = setTimeout(() => searchProducts(searchQuery), 200);
		} else {
			searchResults = [];
		}
	});

	const filteredProducts = $derived.by(() => {
		// If searching, use DB results
		if (searchQuery.trim()) return searchResults;
		// Otherwise filter by category only
		if (!selectedCategory) return products;
		// Simple category filter (parent only, descendants handled by DB if needed)
		return products.filter(p => p.category_id === selectedCategory);
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

	async function submitOrder(): Promise<void> {
		if (!cart.length) { toast.error(t("orders.emptyCart")); return; }
		if (!activeSession) { toast.error(t("register.noActiveSession")); return; }
		if (processing) return; // Prevent double-submit

		// Debounce rapid clicks
		if (submitDebounce) clearTimeout(submitDebounce);
		
		processing = true;
		submitDebounce = setTimeout(async () => {
			try {
				const { data, error } = await supabase.rpc("create_order", {
					p_facility_id: user.facilityId,
					p_session_id: activeSession.id,
					p_user_id: user.id,
					p_items: cart.map(i => ({
						product_id: i.product.id,
						quantity: i.quantity,
						unit_price: i.product.price,
						is_treat: i.isTreat,
					})),
					p_coupon_count: couponCount,
					p_coupon_value: COUPON_VALUE,
				});

				if (error) throw error;
				if (data?.error) { toast.error(data.error); return; }

				lastOrderId = data.id;
				lastOrderData = { items: [...cart], total, discount, couponCount, orderId: data.id };
				toast.success(t("common.success"));
				clearCart();
				showCart = false;
				await invalidateAll();
			} catch {
				toast.error(t("common.error"));
			} finally {
				processing = false;
				submitDebounce = null;
			}
		}, 300);
	}
</script>

<Dialog bind:open {onOpenChange}>
	<DialogContent class="max-w-[100vw] w-full h-[100dvh] max-h-[100dvh] md:max-w-[95vw] md:h-[95vh] md:max-h-[95vh] flex flex-col p-0 gap-0 rounded-none md:rounded-lg [&>button]:hidden">
		<!-- Header -->
		<header class="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
			<div class="flex items-center gap-3">
				<button
					class="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-muted"
					onclick={() => { open = false; onOpenChange?.(false); }}
				>
					<X class="h-5 w-5" />
				</button>
				<h1 class="text-lg font-bold">{t("orders.newSale")}</h1>
			</div>
			<div class="flex items-center gap-2">
				<!-- Mobile cart toggle -->
				<button
					class="md:hidden relative flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
					onclick={() => showCart = !showCart}
				>
					<ShoppingCart class="h-5 w-5" />
					{#if cartItemCount > 0}
						<span class="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
							{cartItemCount}
						</span>
					{/if}
				</button>
				<button
					class="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors"
					onclick={() => { open = false; onOpenChange?.(false); }}
				>
					<X class="h-5 w-5" />
				</button>
			</div>
		</header>

		<div class="flex-1 flex overflow-hidden relative">
			<!-- Products Panel -->
			<div class="flex-1 flex flex-col overflow-hidden {showCart ? 'hidden md:flex' : ''}">
				<!-- Search -->
				<div class="p-3 border-b shrink-0">
					<div class="relative">
						<Search class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
						<Input
							placeholder={t("common.search")}
							class="pl-12 h-12 text-base rounded-xl bg-muted/50 border-0 focus-visible:ring-2"
							bind:value={searchQuery}
						/>
					</div>
				</div>

				<!-- Categories Ribbon -->
				{#if categories.length > 0}
					<div class="shrink-0 border-b bg-muted/30">
						<div class="flex gap-2 p-3 overflow-x-auto scrollbar-thin snap-x snap-mandatory">
							<button
								class="snap-start shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all active:scale-95 {selectedCategory === null ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-background border-2 border-transparent hover:border-primary/20'}"
								onclick={() => selectedCategory = null}
							>
								<Tag class="h-4 w-4" />
								{t("common.viewAll")}
							</button>
							{#each rootCategories as cat (cat.id)}
								<button
									class="snap-start shrink-0 px-5 py-3 rounded-xl font-medium text-sm transition-all active:scale-95 {selectedCategory === cat.id ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-background border-2 border-transparent hover:border-primary/20'}"
									onclick={() => selectedCategory = cat.id}
								>
									{cat.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Products Grid -->
				<div class="flex-1 overflow-y-auto p-3 bg-muted/20">
					<div class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{#each filteredProducts as product (product.id)}
							<button
								class="group flex flex-col rounded-2xl border-2 border-transparent bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-lg active:scale-[0.97] active:shadow-none"
								onclick={() => addToCart(product)}
							>
								<span class="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</span>
								<div class="mt-auto pt-3 flex items-end justify-between">
									<span class="text-lg font-bold text-primary">{fmtCurrency(product.price)}</span>
									{#if product.stock_quantity >= 0}
										<Badge variant="outline" class="text-[10px] px-1.5">{product.stock_quantity}</Badge>
									{/if}
								</div>
								<div class="mt-2 flex items-center justify-center w-full h-10 rounded-xl bg-primary/10 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
									<Plus class="h-4 w-4 mr-1" /> {t("common.add")}
								</div>
							</button>
						{:else}
							<div class="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
								<Search class="h-12 w-12 mb-3 opacity-30" />
								<p class="text-sm">{t("common.noResults")}</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Mobile Cart Summary Bar -->
				{#if cart.length > 0}
					<div class="md:hidden shrink-0 p-3 border-t bg-background">
						<button
							class="w-full flex items-center justify-between p-4 rounded-2xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
							onclick={() => showCart = true}
						>
							<div class="flex items-center gap-3">
								<div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-foreground/20">
									<ShoppingCart class="h-5 w-5" />
								</div>
								<div class="text-left">
									<p class="font-bold text-lg">{fmtCurrency(total)}</p>
									<p class="text-xs opacity-80">{cartItemCount} {t("common.items")}</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="font-medium">{t("orders.viewCart")}</span>
								<ChevronRight class="h-5 w-5" />
							</div>
						</button>
					</div>
				{/if}
			</div>

			<!-- Cart Panel -->
			<div class="absolute inset-0 md:relative md:inset-auto md:w-96 flex flex-col bg-background {showCart ? '' : 'hidden md:flex'} z-10">
				<!-- Cart Header -->
				<div class="flex items-center justify-between p-4 border-b shrink-0">
					<div class="flex items-center gap-3">
						<button
							class="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-muted active:scale-95 transition-transform"
							onclick={() => showCart = false}
						>
							<X class="h-5 w-5" />
						</button>
						<h2 class="font-bold text-lg flex items-center gap-2">
							<ShoppingCart class="h-5 w-5" />
							{t("orders.cart")}
							{#if cartItemCount > 0}
								<Badge variant="secondary" class="text-xs">{cartItemCount}</Badge>
							{/if}
						</h2>
					</div>
					{#if cart.length > 0}
						<Button variant="ghost" size="sm" onclick={clearCart} class="text-destructive hover:text-destructive">
							<Trash2 class="h-4 w-4 mr-1" />
							{t("common.clear")}
						</Button>
					{/if}
				</div>

				<!-- Cart Items -->
				<div class="flex-1 overflow-y-auto p-3 space-y-2">
					{#if cart.length === 0}
						<div class="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
							<div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
								<ShoppingCart class="h-10 w-10 opacity-50" />
							</div>
							<p class="font-medium">{t("orders.emptyCart")}</p>
							<p class="text-sm opacity-70 mt-1">{t("orders.addProducts")}</p>
						</div>
					{:else}
						{#each cart as item, idx (item.product.id + (item.isTreat ? '-t' : '') + idx)}
							<div class="rounded-xl border-2 bg-card p-3 space-y-3">
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 min-w-0">
										<p class="font-semibold text-sm">{item.product.name}</p>
										<p class="text-sm text-muted-foreground">{fmtCurrency(item.product.price)} each</p>
									</div>
									<button
										class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
										onclick={() => { cart = cart.filter((_, i) => i !== idx); }}
									>
										<X class="h-4 w-4" />
									</button>
								</div>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-1">
										<button
											class="w-10 h-10 flex items-center justify-center rounded-xl border-2 hover:bg-muted active:scale-95 transition-all"
											onclick={() => updateQuantity(idx, -1)}
										>
											<Minus class="h-4 w-4" />
										</button>
										<span class="w-12 text-center font-bold text-lg">{item.quantity}</span>
										<button
											class="w-10 h-10 flex items-center justify-center rounded-xl border-2 hover:bg-muted active:scale-95 transition-all"
											onclick={() => updateQuantity(idx, 1)}
										>
											<Plus class="h-4 w-4" />
										</button>
									</div>
									<div class="flex items-center gap-2">
										<button
											class="h-10 px-3 flex items-center gap-1.5 rounded-xl text-sm font-medium transition-all active:scale-95 {item.isTreat ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'border-2 hover:bg-muted'}"
											onclick={() => toggleTreat(idx)}
										>
											<Gift class="h-4 w-4" />
											{#if item.isTreat}Treat{/if}
										</button>
										<p class="font-bold text-right min-w-[4rem] {item.isTreat ? 'line-through text-muted-foreground' : ''}">
											{fmtCurrency(item.product.price * item.quantity)}
										</p>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Cart Footer -->
				{#if cart.length > 0}
					<div class="shrink-0 border-t bg-background">
						<!-- Coupons -->
						<div class="flex items-center justify-between p-4 border-b">
							<span class="font-medium">{t("orders.coupons")}</span>
							<div class="flex items-center gap-2">
								<button
									class="w-10 h-10 flex items-center justify-center rounded-xl border-2 hover:bg-muted active:scale-95 transition-all disabled:opacity-50"
									onclick={() => couponCount = Math.max(0, couponCount - 1)}
									disabled={couponCount === 0}
								>
									<Minus class="h-4 w-4" />
								</button>
								<span class="w-10 text-center font-bold text-lg">{couponCount}</span>
								<button
									class="w-10 h-10 flex items-center justify-center rounded-xl border-2 hover:bg-muted active:scale-95 transition-all"
									onclick={() => couponCount++}
								>
									<Plus class="h-4 w-4" />
								</button>
							</div>
						</div>

						<!-- Totals -->
						<div class="p-4 space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-muted-foreground">{t("orders.subtotal")}</span>
								<span class="font-medium">{fmtCurrency(subtotal)}</span>
							</div>
							{#if discount > 0}
								<div class="flex justify-between text-green-600">
									<span>{t("orders.discount")}</span>
									<span class="font-medium">-{fmtCurrency(discount)}</span>
								</div>
							{/if}
							{#if treatCount > 0}
								<div class="flex justify-between text-amber-600">
									<span>{t("orders.treats")}</span>
									<span>{treatCount} {t("common.items")}</span>
								</div>
							{/if}
							<div class="flex justify-between pt-2 border-t text-xl font-bold">
								<span>{t("orders.total")}</span>
								<span class="text-primary">{fmtCurrency(total)}</span>
							</div>
						</div>

						<!-- Submit Button -->
						<div class="p-4 pt-0">
							<Button
								class="w-full h-14 text-lg font-bold rounded-2xl"
								onclick={submitOrder}
								disabled={processing || !activeSession}
							>
								{#if processing}
									<div class="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2"></div>
									{t("common.loading")}
								{:else}
									<Check class="h-6 w-6 mr-2" />
									{t("orders.submitOrder")} · {fmtCurrency(total)}
								{/if}
							</Button>
							{#if !activeSession}
								<p class="text-xs text-center text-destructive mt-2">{t("register.noActiveSession")}</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Success Message -->
				{#if lastOrderId}
					<div class="p-4 bg-green-50 dark:bg-green-950/50 border-t border-green-200 dark:border-green-800">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
								<div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
									<Check class="h-5 w-5" />
								</div>
								<div>
									<p class="font-bold">{t("common.success")}</p>
									<p class="text-xs opacity-70">#{lastOrderId.slice(0, 8)}</p>
								</div>
							</div>
							<Button variant="outline" size="sm" onclick={handlePrintReceipt}>
								<Printer class="h-4 w-4 mr-1" />{t("orders.printReceipt")}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</DialogContent>
</Dialog>
