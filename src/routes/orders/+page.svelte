<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Dialog as DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';

  let showDialog = $state(false);
  let products: Array<{ id: string; name: string; price: number } > = $state([]);
  let cart: Array<{ id: string; name: string; price: number; is_treat?: boolean }> = $state([]);
  let couponApplied = $state(false);
  let loading = $state(false);

  async function loadProducts() {
    const { data, error } = await supabase.from('products').select('id,name,price').order('name');
    if (!error && data) products = data as any;
  }

  function onOpenChange(next: boolean) {
    showDialog = next;
    if (next && products.length === 0) loadProducts();
  }

  function addToCart(p: { id: string; name: string; price: number }) {
    cart = [...cart, { ...p }];
  }

  function toggleTreat(index: number) {
    const next = [...cart];
    next[index].is_treat = !next[index].is_treat;
    cart = next;
  }

  function clearCart() {
    cart = [];
    couponApplied = false;
  }

  $effect(() => {
    // redirect to login if no session
    supabase.auth.getSession().then((result: { data: { session: any } }) => {
      if (!result.data.session) window.location.href = '/login';
    });
  });

  function subtotal() {
    return cart.reduce((acc, item) => acc + (item.is_treat ? 0 : Number(item.price)), 0);
  }

  function discount() {
    return couponApplied ? 2 : 0;
  }

  function total() {
    return Math.max(0, subtotal() - discount());
  }

  let paymentMethod: 'cash' | 'card' = $state('cash');

  async function submitOrder() {
    loading = true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // ensure there is an open register session; if not, open one
    const { data: sessions } = await supabase
      .from('register_sessions')
      .select('id, closed_at')
      .order('opened_at', { ascending: false })
      .limit(1);

    let sessionId = sessions && sessions[0] && !sessions[0].closed_at ? sessions[0].id : null;
    if (!sessionId) {
      const { data: opened, error: openErr } = await supabase
        .from('register_sessions')
        .insert({ opened_by: user.id })
        .select()
        .single();
      if (openErr) { loading = false; return; }
      sessionId = opened.id;
    }

    const orderPayload = {
      session_id: sessionId,
      subtotal: subtotal(),
      discount_amount: discount(),
      total_amount: total(),
      payment_method: paymentMethod,
      card_discounts_applied: 0,
      created_by: user.id,
    } as const;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();
    if (orderErr) { loading = false; return; }

    const items = cart.map((c) => ({
      order_id: order.id,
      product_id: c.id,
      quantity: 1,
      unit_price: Number(c.price),
      line_total: c.is_treat ? 0 : Number(c.price),
      is_treat: !!c.is_treat,
    }));

    const { error: itemErr } = await supabase.from('order_items').insert(items);
    loading = false;
    if (!itemErr) {
      printReceipt(order.id, new Date().toLocaleString());
      clearCart();
      showDialog = false;
    }
  }

  function printReceipt(orderId: string, dateStr: string) {
    const w = window.open('', 'PRINT', 'height=650,width=400,top=100,left=100');
    if (!w) return;
    const rows = cart
      .map((c) => `<tr><td>${c.name}${c.is_treat ? ' (treat)' : ''}</td><td style="text-align:right">€${(c.is_treat ? 0 : Number(c.price)).toFixed(2)}</td></tr>`) 
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${orderId}</title>
      <style>
        body{font:14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;}
        .rcpt{width:260px;margin:0 auto}
        h1{font-size:16px;margin:0 0 8px}
        table{width:100%;border-collapse:collapse}
        tfoot td{font-weight:600;border-top:1px solid #000;padding-top:6px}
      </style>
    </head><body onload="window.print();setTimeout(()=>window.close(),300)">
      <div class="rcpt">
        <h1>clubOS Receipt</h1>
        <div>Order: ${orderId.slice(0,8)}</div>
        <div>${dateStr}</div>
        <hr />
        <table>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td>Subtotal</td><td style="text-align:right">€${subtotal().toFixed(2)}</td></tr>
            <tr><td>Discount</td><td style="text-align:right">€${discount().toFixed(2)}</td></tr>
            <tr><td>Total</td><td style="text-align:right">€${total().toFixed(2)}</td></tr>
          </tfoot>
        </table>
      </div>
    </body></html>`;
    w.document.write(html);
    w.document.close();
  }
</script>

<section class="p-4">
  <div class="flex items-center gap-2 mb-4">
    <DialogRoot open={showDialog} onOpenChange={onOpenChange}>
      <Button onclick={() => onOpenChange(true)}>{t('orders.newSale')}</Button>
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
            <Button variant="outline" onclick={() => onOpenChange(false)}>{t('orders.close')}</Button>
            <Button onclick={submitOrder} disabled={loading || cart.length === 0}>{t('orders.submit')}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </DialogRoot>
  </div>

  <div class="mb-4">
    <h2 class="font-semibold mb-2">{t('orders.recent')}</h2>
    <RecentOrders limit={5} />
  </div>

  
</section>


