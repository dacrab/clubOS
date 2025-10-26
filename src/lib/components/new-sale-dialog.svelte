<script lang="ts">
import {
	Filter,
	Minus,
	Plus,
	ReceiptText,
	ShoppingCart,
	X,
} from "@lucide/svelte";
import { Dialog as DialogPrimitive } from "bits-ui";
import { collectWithDescendants } from "$lib/categories/tree";
import { Button } from "$lib/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { t } from "$lib/i18n";
import {
	subtotal as calcSubtotal,
	discountAmount,
	totalAmount,
} from "$lib/orders/calc";
import { supabase } from "$lib/supabase-client";

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
let tenantId: string | null = $state(null);
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
		const message =
			error instanceof Error ? error.message : t("orders.toast.error");
		toast.error(message);
	}
}

async function ensureFacilityContext(): Promise<void> {
	if (tenantId && facilityId) {
		return;
	}

	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id;
	if (!userId) {
		return;
	}

	// Get tenant
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", userId);

	tenantId = memberships?.[0]?.tenant_id ?? null;
	if (!tenantId) {
		return;
	}

	// Get facility
	const { data: facilities } = await supabase
		.from("facilities")
		.select("id")
		.eq("tenant_id", tenantId)
		.order("name")
		.limit(1);

	const facilityIdValue = facilities?.[0]?.id ?? null;
	if (!facilityIdValue) {
		return;
	}

	// Ensure membership
	const { data: existing } = await supabase
		.from("facility_members")
		.select("facility_id")
		.eq("facility_id", facilityIdValue)
		.eq("user_id", userId)
		.maybeSingle();

	if (!existing) {
		await supabase
			.from("facility_members")
			.upsert(
				{ facility_id: facilityIdValue, user_id: userId },
				{ onConflict: "facility_id,user_id" },
			);
	}

	facilityId = facilityIdValue;
}

async function loadCategories() {
	await ensureFacilityContext();
	if (!(tenantId && facilityId)) {
		categories = [];
		return;
	}

	const { data } = await supabase
		.from("categories")
		.select("id,name,parent_id")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId)
		.order("name");

	categories = (data ?? []) as Category[];
}

async function loadProducts() {
	if (products.length > 0) {
		return; // External products provided
	}

	await ensureFacilityContext();
	if (!(tenantId && facilityId)) {
		internalProducts = [];
		return;
	}

	const { data } = await supabase
		.from("products")
		.select("id,name,price,category_id,image_url")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId)
		.order("name");

	internalProducts = (data ?? []) as Product[];
}

const allProducts: Product[] = $derived(
	products.length > 0 ? products : internalProducts,
);

const filteredProducts: Product[] = $derived(
	(() => {
		if (!selectedCategory) {
			return allProducts;
		}

		const descendantIds = collectWithDescendants(categories, selectedCategory);

		return allProducts.filter(
			(product) =>
				!product.category_id || descendantIds.has(product.category_id),
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
    class="flex max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-outline-soft/70 bg-surface-soft/95 p-0 shadow-xl"
  >
    <DialogHeader class="flex-none border-b border-outline-soft/60 px-6 py-4">
      <div class="flex items-center justify-between">
        <DialogTitle class="text-xl font-semibold text-foreground">
          {t("orders.new")}
        </DialogTitle>
        <DialogClose
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-soft/60 bg-background/90 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          aria-label={t("orders.close")}
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
        class="flex min-h-0 flex-col gap-3 rounded-xl border border-outline-soft/60 bg-background/80 p-3"
      >
        <h3
          class="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Filter class="size-4" />
          {t("orders.categories")}
        </h3>

        <button
          type="button"
          class={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            !selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
          onclick={() => (selectedCategory = null)}
        >
          {t("orders.all")}
        </button>

        <div class="space-y-2 overflow-auto pr-1">
          {#each categories.filter((c) => !c.parent_id) as category}
            <div class="space-y-1">
              <button
                type="button"
                class={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onclick={() => (selectedCategory = category.id)}
              >
                <span class="block truncate">{category.name}</span>
              </button>

              {#each categories.filter((c) => c.parent_id === category.id) as subcategory}
                <button
                  type="button"
                  class={`ml-4 w-[calc(100%-1rem)] rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                    selectedCategory === subcategory.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
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
        class="min-h-0 overflow-auto rounded-xl border border-outline-soft/60 bg-background/70 p-4"
      >
        <div
          class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {#each filteredProducts as product}
            <button
              type="button"
              class="flex h-full flex-col overflow-hidden rounded-xl border border-outline-soft/60 bg-surface transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onclick={() => addToCart(product)}
            >
              {#if product.image_url}
                <div
                  class="flex h-28 w-full items-center justify-center bg-muted/30"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              {:else}
                <div class="h-28 w-full bg-muted/20"></div>
              {/if}

              <div
                class="flex flex-1 flex-col justify-between gap-1 px-3 py-3 text-left"
              >
                <span class="truncate font-medium text-foreground"
                  >{product.name}</span
                >
                <span class="text-sm text-muted-foreground">
                  €{product.price.toFixed(2)}
                </span>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <!-- Cart Sidebar -->
      <aside
        class="flex min-h-0 flex-col rounded-xl border border-outline-soft/60 bg-background/80 p-4"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">
            {t("orders.cart")} ({cart.length})
          </h3>
          {#if cart.length > 0}
            <Button type="button" variant="ghost" size="sm" onclick={clearCart}>
              {t("orders.clear")}
            </Button>
          {/if}
        </div>

        <div class="flex-1 space-y-2 overflow-auto pr-1">
          {#if cart.length === 0}
            <div
              class="grid place-items-center gap-2 rounded-lg border border-dashed border-outline-soft/60 bg-surface px-6 py-10 text-center text-sm text-muted-foreground"
            >
              <ShoppingCart class="size-10 opacity-50" />
              <p>{t("orders.emptyCart")}</p>
            </div>
          {:else}
            {#each cart as item, index}
              <div
                class="flex items-center justify-between gap-3 rounded-lg border border-outline-soft/40 bg-surface px-3 py-2 text-sm"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium text-foreground">
                    {item.name}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    €{item.is_treat ? "0.00" : item.price.toFixed(2)}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={item.is_treat ? "default" : "outline"}
                    size="sm"
                    class="rounded-lg"
                    onclick={() => toggleTreat(index)}
                  >
                    {item.is_treat ? t("orders.treat") : t("orders.free")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="rounded-lg"
                    onclick={() => removeFromCart(index)}
                    aria-label={t("common.delete")}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Coupons and Totals -->
        <div class="mt-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-foreground">{t("orders.coupons")}</span>
            <div
              class="inline-flex items-center gap-2 rounded-lg border border-outline-soft/60 bg-surface px-2 py-1"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="size-7 rounded-md"
                onclick={() => (couponCount = Math.max(0, couponCount - 1))}
                aria-label={t("orders.decrementCoupon")}
              >
                <Minus class="size-3.5" />
              </Button>
              <span class="w-6 text-center text-sm font-semibold"
                >{couponCount}</span
              >
              <Button
                type="button"
                size="icon"
                class="size-7 rounded-md"
                onclick={() => (couponCount = couponCount + 1)}
                aria-label={t("orders.incrementCoupon")}
              >
                <Plus class="size-3.5" />
              </Button>
            </div>
          </div>

          <div
            class="space-y-1 rounded-lg border border-outline-soft/50 bg-surface px-3 py-3 text-sm"
          >
            <div class="flex justify-between text-muted-foreground">
              <span>{t("orders.subtotal")}</span>
              <span>€{subtotal().toFixed(2)}</span>
            </div>
            <div
              class="flex justify-between text-emerald-600 dark:text-emerald-300"
            >
              <span>{t("orders.discount")}</span>
              <span>-€{discount().toFixed(2)}</span>
            </div>
            <div
              class="flex justify-between border-t border-outline-soft/40 pt-2 text-base font-semibold"
            >
              <span>{t("orders.total")}</span>
              <span class="text-primary">€{total().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter
          class="mt-4 flex justify-end gap-2 border-t border-outline-soft/50 pt-3"
        >
          <Button
            type="button"
            variant="outline"
            class="rounded-lg"
            onclick={() => (open = false)}
          >
            {t("orders.close")}
          </Button>
          <Button
            type="button"
            class="rounded-lg px-6"
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
