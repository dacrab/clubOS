<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";

const DialogRoot = DialogPrimitive.Root;

import { Filter, Minus, Plus, ReceiptText, ShoppingCart } from "@lucide/svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
  image_url?: string | null;
};
type CartItem = { id: string; name: string; price: number; is_treat?: boolean };

let {
  open = $bindable(false),
  products = [] as Array<Product>,
  onSubmit,
} = $props<{
  open: boolean;
  products?: Array<Product>;
  onSubmit: (payload: {
    items: Array<CartItem>;
    paymentMethod: "cash";
    couponCount: number;
  }) => Promise<void>;
}>();

let cart: Array<CartItem> = $state([]);
let couponCount = $state(0);
let selectedCategory = $state<string | null>(null);
let categories: Array<{ id: string; name: string; parent_id: string | null }> =
  $state([]);
let internalProducts: Array<Product> = $state([]);
let productsPane: HTMLElement | null = $state(null);
let scrollTop = $state(0);
let viewportHeight = $state(0);
const LG_COLUMNS = 4;
const MD_COLUMNS = 3;
const SM_COLUMNS = 2;
let colCount = $state(LG_COLUMNS);
const CARD_ROW_HEIGHT = 152; // px (card height + vertical gap approximation)

function addToCart(p: { id: string; name: string; price: number }) {
  cart = [...cart, { ...p }];
}
function toggleTreat(index: number) {
  if (index < 0 || index >= cart.length) return;
  const next = [...cart];
  const existing = next[index];
  if (!existing) return;
  next[index] = { ...existing, is_treat: !existing.is_treat };
  cart = next;
}
function removeFromCart(index: number) {
  if (index < 0 || index >= cart.length) return;
  const next = [...cart];
  next.splice(index, 1);
  cart = next;
}
function clearCart() {
  cart = [];
  couponCount = 0;
}
function subtotal() {
  return cart.reduce(
    (acc, item) => acc + (item.is_treat ? 0 : Number(item.price)),
    0
  );
}
function discount() {
  return Math.max(0, couponCount) * 2;
}
function total() {
  return Math.max(0, subtotal() - discount());
}

async function submit() {
  await onSubmit({ items: cart, paymentMethod: "cash", couponCount });
  clearCart();
  open = false;
}

async function loadCategories() {
  const { data } = await supabase
    .from("categories")
    .select("id,name,parent_id")
    .order("name");
  categories = (data ?? []) as any;
}
async function loadProductsIfNeeded() {
  if ((products?.length ?? 0) > 0) return; // external products provided
  const { data } = await supabase
    .from("products")
    .select("id,name,price,category_id,image_url")
    .order("name");
  internalProducts = (data ?? []) as any;
}
const allProducts = $derived<Array<Product>>(
  (products?.length ?? 0) > 0 ? (products as Array<Product>) : internalProducts
);
const filteredProducts = $derived<Array<Product>>(
  (() => {
    if (!selectedCategory) return allProducts;
    const descendantIds = new Set<string>();
    function addChildren(parentId: string) {
      for (const c of categories) {
        if (c.parent_id === parentId) {
          descendantIds.add(c.id);
          addChildren(c.id);
        }
      }
    }
    descendantIds.add(selectedCategory);
    addChildren(selectedCategory);
    return allProducts.filter(
      (p: Product) => !p.category_id || descendantIds.has(p.category_id)
    );
  })()
);

$effect(() => {
  if (open) {
    loadCategories();
    loadProductsIfNeeded();
  }
});

function updateLayoutMetrics() {
  if (!productsPane) return;
  viewportHeight = productsPane.clientHeight;
  const w = productsPane.clientWidth;
  const BREAKPOINT_LG = 1024;
  const BREAKPOINT_MD = 768;
  if (w >= BREAKPOINT_LG) {
    colCount = LG_COLUMNS;
  } else if (w >= BREAKPOINT_MD) {
    colCount = MD_COLUMNS;
  } else {
    colCount = SM_COLUMNS;
  }
}
function onProductsScroll() {
  scrollTop = productsPane?.scrollTop ?? 0;
}
$effect(() => {
  if (!open) return;
  updateLayoutMetrics();
  const onResize = () => updateLayoutMetrics();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});

const rowCount = $derived(Math.ceil(filteredProducts.length / colCount));
const totalHeight = $derived(rowCount * CARD_ROW_HEIGHT);
const startRow = $derived(
  Math.max(0, Math.floor(scrollTop / CARD_ROW_HEIGHT) - 2)
);
const endRow = $derived(
  Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / CARD_ROW_HEIGHT) + 2
  )
);
const startIndex = $derived(startRow * colCount);
const endIndex = $derived(Math.min(filteredProducts.length, endRow * colCount));
const visibleProducts = $derived(filteredProducts.slice(startIndex, endIndex));
const translateY = $derived(startRow * CARD_ROW_HEIGHT);
</script>

<DialogRoot bind:open={open}>
  <DialogContent size="fullscreen" class="pb-2">
    <DialogHeader class="pb-4">
      <DialogTitle class="text-2xl font-bold">{t('orders.new')}</DialogTitle>
    </DialogHeader>

    <div class="grid grid-cols-[220px_1fr_360px] gap-4 h-[calc(90vh-5rem)]">
      <!-- Categories -->
      <aside class="border rounded-md p-3 overflow-auto min-w-[220px]">
        <h3 class="text-sm font-semibold mb-2 inline-flex items-center gap-2"><Filter class="w-4 h-4" /> {t('orders.categories')}</h3>
        <button class={`w-full text-left px-2 py-1 rounded ${!selectedCategory ? 'bg-accent text-accent-foreground' : ''}`} onclick={() => selectedCategory = null}>{t('orders.all')}</button>
        {#each categories.filter((c) => !c.parent_id) as cat}
          <div class="mt-2">
            <button class={`w-full text-left px-2 py-1 rounded ${selectedCategory === cat.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} onclick={() => selectedCategory = cat.id}>{cat.name}</button>
            {#each categories.filter((c) => c.parent_id === cat.id) as sub}
              <button class={`ml-3 mt-1 w-[calc(100%-0.75rem)] text-left px-2 py-1 rounded ${selectedCategory === sub.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} onclick={() => selectedCategory = sub.id}>{sub.name}</button>
            {/each}
          </div>
        {/each}
      </aside>

      <!-- Products Grid -->
      <section class="border rounded-md p-3 min-w-0 overflow-auto" bind:this={productsPane} onscroll={onProductsScroll}>
        <div class="relative" style={`height:${totalHeight}px`}>
          <div class="absolute left-0 right-0" style={`transform: translateY(${translateY}px)`}>
            <div class={`grid gap-3 content-start ${colCount === 4 ? 'grid-cols-4' : colCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} auto-rows-[minmax(120px,1fr)]`}>
              {#each visibleProducts as p}
                <button class="border rounded-md p-0 text-left hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary overflow-hidden" onclick={() => addToCart(p)}>
                  {#if p.image_url}
                    <div class="h-24 w-full bg-muted/50 flex items-center justify-center">
                      <img src={p.image_url} alt={p.name} class="h-full w-full object-cover" />
                    </div>
                    <div class="p-3">
                      <div class="font-medium truncate">{p.name}</div>
                      <div class="text-sm text-muted-foreground">€{Number(p.price).toFixed(2)}</div>
                    </div>
                  {:else}
                    <div class="p-3 h-full grid content-between">
                      <div class="font-medium truncate">{p.name}</div>
                      <div class="text-sm text-muted-foreground">€{Number(p.price).toFixed(2)}</div>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </section>

      <!-- Order Summary -->
      <aside class="border rounded-md p-3 flex flex-col min-w-[340px] overflow-auto">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-lg">Cart ({cart.length})</h3>
          {#if cart.length > 0}
            <Button variant="ghost" size="sm" onclick={clearCart}>Clear</Button>
          {/if}
        </div>
        <div class="flex-1 overflow-auto space-y-2">
          {#if cart.length === 0}
            <div class="text-center py-8 text-muted-foreground">
              <ShoppingCart class="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          {:else}
            {#each cart as item, i}
              <div class="flex items-center justify-between p-2 rounded bg-muted/50">
                <div class="min-w-0">
                  <div class="font-medium truncate">{item.name}</div>
                  <div class="text-xs text-muted-foreground">€{item.is_treat ? '0.00' : Number(item.price).toFixed(2)}</div>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant={item.is_treat ? 'default' : 'outline'} size="sm" onclick={() => toggleTreat(i)}>
                    {item.is_treat ? 'Treat' : 'Free'}
                  </Button>
                  <Button variant="ghost" size="icon" onclick={() => removeFromCart(i)}>✕</Button>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="mt-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm">{t('orders.coupons')}</span>
            <div class="inline-flex items-center gap-2">
              <Button size="sm" variant="outline" onclick={() => couponCount = Math.max(0, couponCount - 1)}><Minus class="w-3.5 h-3.5" /></Button>
              <span class="w-6 text-center">{couponCount}</span>
              <Button size="sm" onclick={() => couponCount = couponCount + 1}><Plus class="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <div class="bg-muted/50 p-3 rounded space-y-1">
            <div class="flex justify-between text-sm"><span>{t('orders.subtotal')}</span><span>€{subtotal().toFixed(2)}</span></div>
            <div class="flex justify-between text-sm"><span>{t('orders.discount')}</span><span class="text-green-600 dark:text-green-400">-€{discount().toFixed(2)}</span></div>
            <div class="border-t pt-2 flex justify-between font-semibold"><span>{t('orders.total')}</span><span class="text-primary">€{total().toFixed(2)}</span></div>
          </div>
        </div>

        <DialogFooter class="mt-3 sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-t pt-3 flex justify-end gap-2">
          <Button variant="outline" onclick={() => (open = false)}>{t('orders.close')}</Button>
          <Button onclick={submit} disabled={cart.length === 0} class="px-6">
            <ReceiptText class="mr-2 h-4 w-4" />
            {t('orders.submit')}
          </Button>
        </DialogFooter>
      </aside>
    </div>
  </DialogContent>
</DialogRoot>
