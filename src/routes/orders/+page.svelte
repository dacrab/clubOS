<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';

  let showDialog = $state(false);
  let products: Array<{ id: string; name: string; price: number } > = $state([]);
  let cart: Array<{ id: string; name: string; price: number; is_treat?: boolean }> = $state([]);
  let couponApplied = $state(false);
  let loading = $state(false);

  async function loadProducts() {
    const { data, error } = await supabase.from('products').select('id,name,price').order('name');
    if (!error && data) products = data as any;
  }

  function openDialog() {
    showDialog = true;
    if (products.length === 0) loadProducts();
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
      payment_method: 'cash',
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
      clearCart();
      showDialog = false;
    }
  }
</script>

<section class="p-4">
  <div class="flex items-center gap-2 mb-4">
    <button class="border rounded px-3 py-1" onclick={openDialog}>{t('orders.newSale')}</button>
    <button class="border rounded px-3 py-1" onclick={() => (couponApplied = !couponApplied)} aria-pressed={couponApplied}>
      {t('orders.coupon')}
    </button>
  </div>

  <div class="mb-4">
    <h2 class="font-semibold mb-2">{t('orders.recent')}</h2>
    <!-- TODO: query last 5 orders and render -->
  </div>

  {#if showDialog}
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div class="bg-white rounded shadow max-w-2xl w-full p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">{t('orders.products')}</h3>
          <button class="border rounded px-2 py-1" onclick={() => (showDialog = false)}>{t('orders.close')}</button>
        </div>
        <div class="grid grid-cols-2 gap-2 max-h-72 overflow-auto mb-3">
          {#each products as p}
            <button class="border rounded p-2 text-left" onclick={() => addToCart(p)}>
              <div class="font-medium">{p.name}</div>
              <div class="text-sm opacity-70">€{Number(p.price).toFixed(2)}</div>
            </button>
          {/each}
        </div>
        <div class="border-t pt-3">
          <h4 class="font-semibold mb-2">Cart</h4>
          <ul class="space-y-2 mb-3">
            {#each cart as item, i}
              <li class="flex items-center justify-between gap-2">
                <div>
                  <div>{item.name}</div>
                  <div class="text-xs opacity-70">€{item.is_treat ? '0.00' : Number(item.price).toFixed(2)}</div>
                </div>
                <button class="border rounded px-2 py-1" onclick={() => toggleTreat(i)}>{t('orders.treat')}</button>
              </li>
            {/each}
          </ul>
          <div class="flex flex-col gap-1 mb-3 text-sm">
            <div class="flex justify-between"><span>{t('orders.subtotal')}</span><span>€{subtotal().toFixed(2)}</span></div>
            <div class="flex justify-between"><span>{t('orders.discount')}</span><span>€{discount().toFixed(2)}</span></div>
            <div class="flex justify-between font-semibold"><span>{t('orders.total')}</span><span>€{total().toFixed(2)}</span></div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="border rounded px-3 py-1" onclick={clearCart}>{t('orders.close')}</button>
            <button class="border rounded px-3 py-1" onclick={submitOrder} disabled={loading || cart.length === 0}>{t('orders.submit')}</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>


