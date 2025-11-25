<script lang="ts">
import { Filter, Minus, Plus, ReceiptText, ShoppingCart, X } from "@lucide/svelte";
import { Dialog as DialogPrimitive, Separator as SeparatorPrimitive } from "bits-ui";
import { Button } from "$lib/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { collectWithDescendants } from "$lib/utils/category-tree";
import {
	subtotal as calcSubtotal,
	discountAmount,
	totalAmount,
} from "$lib/utils/order-calculations";
import { supabase } from "$lib/utils/supabase";

const DialogRoot = DialogPrimitive.Root;

type Product = {
	id: string;
	name: string;
	price: number;
	category_id?: string | null;
	image_url?: string | null;
};

type CartItem = {
	id: string;
	name: string;
	price: number;
	is_treat?: boolean;
};

type Category = {
	id: string;
	name: string;
	parent_id: string | null;
};

let {
	open = $bindable(false),
	products = [] as Product[],
	onSubmit,
} = $props<{
	open: boolean;
	products?: Product[];
	onSubmit: (payload: {
		items: CartItem[];
		paymentMethod: "cash";
		couponCount: number;
	}) => Promise<void>;
}>();

let cart: CartItem[] = $state([]);
let couponCount = $state(0);
let selectedCategory = $state<string | null>(null);
let categories: Category[] = $state([]);
let internalProducts: Product[] = $state([]);
let facilityId: string | null = $state(null);

function addToCart(product: Product) {
	cart = [...cart, { ...product }];
}

function toggleTreat(index: number) {
	if (index < 0 || index >= cart.length) {
		return;
	}

	const updatedCart = [...cart];
	const item = updatedCart[index];
	if (item) {
		updatedCart[index] = { ...item, is_treat: !item.is_treat };
		cart = updatedCart;
	}
}

function removeFromCart(index: number) {
	if (index < 0 || index >= cart.length) {
		return;
	}

	const updatedCart = [...cart];
	updatedCart.splice(index, 1);
	cart = updatedCart;
}

function clearCart() {
	cart = [];
	couponCount = 0;
}

function subtotal() {
	return calcSubtotal(cart);
}

function discount() {
	return discountAmount(couponCount);
}

function total() {
	return totalAmount(cart, couponCount);
}

async function submit() {
	try {
		await onSubmit({ items: cart, paymentMethod: "cash", couponCount });
		const { toast } = await import("svelte-sonner");
		toast.success(t("orders.toast.success"));
		clearCart();
	} catch (error) {
		const { toast } = await import("svelte-sonner");
		const message = error instanceof Error ? error.message : t("orders.toast.error");
		toast.error(message);
	}
}

async function ensureFacilityContext(): Promise<void> {
	facilityId = await facilityState.resolveSelected();
}

async function loadCategories() {
	await ensureFacilityContext();
	if (!facilityId) {
		categories = [];
		return;
	}

	const { data } = await supabase
		.from("categories")
		.select("id,name,parent_id")
		.eq("facility_id", facilityId)
		.order("name");

	categories = (data ?? []) as Category[];
}

async function loadProducts() {
	if (products.length > 0) {
		return; // External products provided
	}

	await ensureFacilityContext();
	if (!facilityId) {
		internalProducts = [];
		return;
	}

	const { data } = await supabase
		.from("products")
		.select("id,name,price,category_id,image_url")
		.eq("facility_id", facilityId)
		.order("name");

	internalProducts = (data ?? []) as Product[];
}

const allProducts: Product[] = $derived(products.length > 0 ? products : internalProducts);

const filteredProducts: Product[] = $derived(
	(() => {
		if (!selectedCategory) {
			return allProducts;
		}

		const descendantIds = collectWithDescendants(categories, selectedCategory);

		return allProducts.filter(
			(product) => !product.category_id || descendantIds.has(product.category_id),
		);
	})(),
);

$effect(() => {
	if (open) {
		loadCategories();
		loadProducts();
	}
});
</script>

<DialogRoot bind:open>
  <DialogContent
    size="fullscreen"
    showCloseButton={false}
    class="flex max-h-[92vh] flex-col overflow-hidden rounded-xl border border-border bg-background p-0 shadow-xl"
  >
    <DialogHeader class="flex-none border-b border-border px-6 py-4">
      <div class="flex items-center justify-between">
        <DialogTitle class="text-xl font-semibold text-foreground">
          {t("orders.new")}
        </DialogTitle>
        <DialogClose
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("common.close")}
        >
          <X class="size-4" />
        </DialogClose>
      </div>
    </DialogHeader>

    <div
      class="grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-hidden px-6 pb-6 pt-4 md:grid-cols-[240px_1fr_360px]"
    >
      <!-- Categories Sidebar -->
      <aside
        class="flex min-h-0 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3"
      >
        <h3
          class="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Filter class="size-4" />
          {t("nav.categories")}
        </h3>

        <button
          type="button"
          class={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
            !selectedCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          onclick={() => (selectedCategory = null)}
        >
          {t("date.all")}
        </button>

        <div class="space-y-2 overflow-auto pr-1">
          {#each categories.filter((c) => !c.parent_id) as category}
            <div class="space-y-1">
              <button
                type="button"
                class={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onclick={() => (selectedCategory = category.id)}
              >
                <span class="block truncate">{category.name}</span>
              </button>

              {#each categories.filter((c) => c.parent_id === category.id) as subcategory}
                <button
                  type="button"
                  class={`ml-4 w-[calc(100%-1rem)] rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                    selectedCategory === subcategory.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  onclick={() => (selectedCategory = subcategory.id)}
                >
                  <span class="block truncate">{subcategory.name}</span>
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </aside>

      <!-- Products Grid -->
      <section
        class="min-h-0 overflow-auto rounded-lg border border-border bg-background p-4"
      >
        <div
          class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {#each filteredProducts as product}
            <button
              type="button"
              class="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onclick={() => addToCart(product)}
            >
              {#if product.image_url}
                <div
                  class="flex h-32 w-full items-center justify-center bg-muted"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              {:else}
                <div class="h-32 w-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                  <ShoppingCart class="size-8 opacity-20" />
                </div>
              {/if}

              <div
                class="flex flex-1 flex-col justify-between gap-2 p-3 text-left"
              >
                <span class="line-clamp-2 font-medium text-sm text-card-foreground"
                  >{product.name}</span
                >
                <span class="text-sm font-semibold text-primary">
                  €{product.price.toFixed(2)}
                </span>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <!-- Cart Sidebar -->
      <aside
        class="flex min-h-0 flex-col rounded-lg border border-border bg-muted/30 p-4"
      >
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">
            {t("orders.cart")} <span class="text-muted-foreground text-sm font-normal ml-1">({cart.length})</span>
          </h3>
          {#if cart.length > 0}
            <Button type="button" variant="ghost" size="sm" onclick={clearCart} class="h-8 text-muted-foreground hover:text-foreground">
              {t("common.clear")}
            </Button>
          {/if}
        </div>

        <div class="flex-1 space-y-2 overflow-auto pr-1">
          {#if cart.length === 0}
            <div
              class="grid place-items-center gap-2 rounded-lg border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground"
            >
              <ShoppingCart class="size-10 opacity-20" />
              <p>{t("orders.emptyCart")}</p>
            </div>
          {:else}
            {#each cart as item, index}
              <div
                class="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 shadow-sm transition-all hover:border-primary/20"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    €{item.is_treat ? "0.00" : item.price.toFixed(2)}
                  </div>
                </div>

                <div class="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={item.is_treat ? "secondary" : "ghost"}
                    size="sm"
                    class={`h-7 px-2 text-xs ${item.is_treat ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-muted-foreground"}`}
                    onclick={() => toggleTreat(index)}
                  >
                    {item.is_treat ? t("orders.treat") : t("orders.free")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onclick={() => removeFromCart(index)}
                    aria-label={t("common.delete")}
                  >
                    <X class="size-3.5" />
                  </Button>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Coupons and Totals -->
        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between rounded-lg border border-border bg-background p-2">
            <span class="text-sm font-medium pl-2 text-muted-foreground">{t("orders.coupons")}</span>
            <div
              class="flex items-center gap-1"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="size-7 rounded-md"
                onclick={() => (couponCount = Math.max(0, couponCount - 1))}
                aria-label={t("orders.decrementCoupon")}
                disabled={couponCount <= 0}
              >
                <Minus class="size-3.5" />
              </Button>
              <span class="w-8 text-center text-sm font-semibold tabular-nums"
                >{couponCount}</span
              >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="size-7 rounded-md"
                onclick={() => (couponCount = couponCount + 1)}
                aria-label={t("orders.incrementCoupon")}
              >
                <Plus class="size-3.5" />
              </Button>
            </div>
          </div>

          <div
            class="space-y-2 rounded-lg border border-border bg-background p-4 shadow-sm"
          >
            <div class="flex justify-between text-sm text-muted-foreground">
              <span>{t("orders.subtotal")}</span>
              <span>€{subtotal().toFixed(2)}</span>
            </div>
            {#if discount() > 0}
              <div
                class="flex justify-between text-sm text-emerald-600 dark:text-emerald-400"
              >
                <span>{t("orders.discount")}</span>
                <span>-€{discount().toFixed(2)}</span>
              </div>
            {/if}
            <SeparatorPrimitive.Root class="my-2 h-px bg-border" />
            <div
              class="flex justify-between text-lg font-bold text-foreground"
            >
              <span>{t("orders.total")}</span>
              <span class="text-primary">€{total().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter
          class="mt-4 flex gap-2 border-t border-border pt-4"
        >
          <Button
            type="button"
            variant="outline"
            class="flex-1"
            onclick={() => (open = false)}
          >
            {t("common.close")}
          </Button>
          <Button
            type="button"
            class="flex-[2]"
            onclick={submit}
            disabled={cart.length === 0}
          >
            <ReceiptText class="mr-2 h-4 w-4" />
            {t("orders.submit")}
          </Button>
        </DialogFooter>
      </aside>
    </div>
  </DialogContent>
</DialogRoot>
