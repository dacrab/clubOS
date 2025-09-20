<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  const DialogRoot = DialogPrimitive.Root;
  import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
  import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
  import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
  import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
  import { t } from '$lib/i18n';
  import * as RadioGroup from '$lib/components/ui/radio-group';
  import { ShoppingCart, ReceiptText } from '@lucide/svelte';

  let { open = $bindable(false), products = [] as Array<{ id: string; name: string; price: number }>, onSubmit } = $props<{
    open: boolean;
    products: Array<{ id: string; name: string; price: number }>;
    onSubmit: (payload: { items: Array<{ id: string; name: string; price: number; is_treat?: boolean }>, paymentMethod: 'cash'|'card', coupon: boolean }) => Promise<void>;
  }>();

  let cart: Array<{ id: string; name: string; price: number; is_treat?: boolean }> = $state([]);
  let couponApplied = $state(false);
  let paymentMethod: 'cash' | 'card' = $state('cash');

  function addToCart(p: { id: string; name: string; price: number }) { cart = [...cart, { ...p }]; }
  function toggleTreat(index: number) { const next = [...cart]; next[index].is_treat = !next[index].is_treat; cart = next; }
  function clearCart() { cart = []; couponApplied = false; }
  function subtotal() { return cart.reduce((acc, item) => acc + (item.is_treat ? 0 : Number(item.price)), 0); }
  function discount() { return couponApplied ? 2 : 0; }
  function total() { return Math.max(0, subtotal() - discount()); }

  async function submit() {
    await onSubmit({ items: cart, paymentMethod, coupon: couponApplied });
    clearCart();
    open = false;
  }
</script>

<DialogRoot bind:open={open}>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden">
    <DialogHeader class="pb-4">
      <DialogTitle class="text-2xl font-bold">{t('orders.products')}</DialogTitle>
      <p class="text-muted-foreground">Select products to add to cart</p>
    </DialogHeader>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Products Grid -->
      <div class="space-y-4">
        <h3 class="font-semibold text-lg">Available Products</h3>
        <div class="grid grid-cols-2 gap-3 max-h-80 overflow-auto scrollbar-thin">
          {#each products as p}
            <Button
              variant="outline"
              class="justify-between h-auto p-4 text-left hover:bg-accent/50 transition-colors"
              onclick={() => addToCart(p)}
            >
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{p.name}</div>
              </div>
              <div class="text-lg font-bold text-primary ml-3">€{Number(p.price).toFixed(2)}</div>
            </Button>
          {/each}
        </div>
      </div>

      <!-- Cart Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-lg">Cart ({cart.length} items)</h3>
          {#if cart.length > 0}
            <Button variant="ghost" size="sm" onclick={clearCart}>Clear</Button>
          {/if}
        </div>

        <!-- Cart Items -->
        <div class="max-h-64 overflow-auto scrollbar-thin">
          {#if cart.length === 0}
            <div class="text-center py-8 text-muted-foreground">
              <ShoppingCart class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Your cart is empty</p>
              <p class="text-sm">Add some products to get started</p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each cart as item, i}
                <div class="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{item.name}</div>
                    <div class="text-sm text-muted-foreground">
                      €{item.is_treat ? '0.00' : Number(item.price).toFixed(2)}
                      {#if item.is_treat}
                        <span class="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">Free</span>
                      {/if}
                    </div>
                  </div>
                  <Button
                    variant={item.is_treat ? "default" : "outline"}
                    size="sm"
                    onclick={() => toggleTreat(i)}
                    class="ml-2"
                  >
                    {item.is_treat ? 'Treat' : 'Make Free'}
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Payment Options -->
        <div class="space-y-3">
          <h4 class="font-semibold">Payment Method</h4>
          <RadioGroup.Root bind:value={paymentMethod} class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50">
              <RadioGroup.Item value="cash" />
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <span class="text-green-600 dark:text-green-400 font-bold text-sm">€</span>
                </div>
                <span>Cash</span>
              </div>
            </label>
            <label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50">
              <RadioGroup.Item value="card" />
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <span class="text-blue-600 dark:text-blue-400 font-bold text-sm">💳</span>
                </div>
                <span>Card</span>
              </div>
            </label>
          </RadioGroup.Root>

          <Button
            variant="outline"
            onclick={() => (couponApplied = !couponApplied)}
            aria-pressed={couponApplied}
            class="w-full justify-start"
          >
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                <span class="text-orange-600 dark:text-orange-400 text-xs">%</span>
              </div>
              {t('orders.coupon')} {couponApplied ? '(Applied)' : '(€2 off)'}
            </div>
          </Button>
        </div>

        <!-- Total -->
        <div class="bg-muted/50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span>{t('orders.subtotal')}</span>
            <span>€{subtotal().toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>{t('orders.discount')}</span>
            <span class="text-green-600 dark:text-green-400">-€{discount().toFixed(2)}</span>
          </div>
          <div class="border-t pt-2">
            <div class="flex justify-between font-bold text-lg">
              <span>{t('orders.total')}</span>
              <span class="text-primary">€{total().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DialogFooter class="flex justify-end gap-3 pt-4 border-t">
      <Button variant="outline" onclick={() => (open = false)} size="lg">
        {t('orders.close')}
      </Button>
      <Button
        onclick={submit}
        disabled={cart.length === 0}
        size="lg"
        class="px-8"
      >
        <ReceiptText class="mr-2 h-4 w-4" />
        {t('orders.submit')}
      </Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>
