<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  const DialogRoot = DialogPrimitive.Root;
  import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
  import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
  import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
  import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
  import { t } from '$lib/i18n';

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
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{t('orders.products')}</DialogTitle>
    </DialogHeader>
    <div class="grid grid-cols-2 gap-2 max-h-72 overflow-auto mb-3">
      {#each products as p}
        <Button variant="outline" class="justify-start" onclick={() => addToCart(p)}>
          <div class="font-medium">{p.name}</div>
          <div class="text-sm opacity-70 ml-auto">€{Number(p.price).toFixed(2)}</div>
        </Button>
      {/each}
    </div>
    <div class="border-t pt-3">
      <h4 class="font-semibold mb-2">Cart</h4>
      <div class="mb-2 flex items-center gap-3 text-sm">
        <label class="flex items-center gap-1"><input type="radio" name="pm" value="cash" checked={paymentMethod==='cash'} onclick={() => paymentMethod='cash'} /> Cash</label>
        <label class="flex items-center gap-1"><input type="radio" name="pm" value="card" checked={paymentMethod==='card'} onclick={() => paymentMethod='card'} /> Card</label>
        <Button variant="outline" onclick={() => (couponApplied = !couponApplied)} aria-pressed={couponApplied}>{t('orders.coupon')}</Button>
      </div>
      <ul class="space-y-2 mb-3">
        {#each cart as item, i}
          <li class="flex items-center justify-between gap-2">
            <div>
              <div>{item.name}</div>
              <div class="text-xs opacity-70">€{item.is_treat ? '0.00' : Number(item.price).toFixed(2)}</div>
            </div>
            <Button variant="outline" onclick={() => toggleTreat(i)}>{t('orders.treat')}</Button>
          </li>
        {/each}
      </ul>
      <div class="flex flex-col gap-1 mb-3 text-sm">
        <div class="flex justify-between"><span>{t('orders.subtotal')}</span><span>€{subtotal().toFixed(2)}</span></div>
        <div class="flex justify-between"><span>{t('orders.discount')}</span><span>€{discount().toFixed(2)}</span></div>
        <div class="flex justify-between font-semibold"><span>{t('orders.total')}</span><span>€{total().toFixed(2)}</span></div>
      </div>
      <DialogFooter class="flex justify-end gap-2">
        <Button variant="outline" onclick={() => (open = false)}>{t('orders.close')}</Button>
        <Button onclick={submit} disabled={cart.length === 0}>{t('orders.submit')}</Button>
      </DialogFooter>
    </div>
  </DialogContent>
</DialogRoot>
