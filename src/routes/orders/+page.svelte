<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import NewSaleDialog from './NewSaleDialog.svelte';

  let showDialog = $state(false);
  let products: Array<{ id: string; name: string; price: number } > = $state([]);

  async function loadProducts() {
    const { data, error } = await supabase.from('products').select('id,name,price').order('name');
    if (!error && data) products = data as any;
  }

  function onOpenChange(next: boolean) {
    showDialog = next;
    if (next && products.length === 0) loadProducts();
  }

  async function ensureSession(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; throw new Error('No user'); }
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
      if (openErr) throw openErr;
      sessionId = opened.id;
    }
    return sessionId as string;
  }

  async function submitSale(payload: { items: Array<{ id: string; name: string; price: number; is_treat?: boolean }>, paymentMethod: 'cash'|'card', coupon: boolean }) {
    const sessionId = await ensureSession();
    const subtotal = payload.items.reduce((acc, i) => acc + (i.is_treat ? 0 : Number(i.price)), 0);
    const discount_amount = payload.coupon ? 2 : 0;
    const total_amount = Math.max(0, subtotal - discount_amount);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        session_id: sessionId,
        subtotal,
        discount_amount,
        total_amount,
        payment_method: payload.paymentMethod,
        card_discounts_applied: 0,
        created_by: user?.id
      })
      .select()
      .single();
    if (orderErr) return;
    const items = payload.items.map((c) => ({
      order_id: order.id,
      product_id: c.id,
      quantity: 1,
      unit_price: Number(c.price),
      line_total: c.is_treat ? 0 : Number(c.price),
      is_treat: !!c.is_treat,
    }));
    await supabase.from('order_items').insert(items);
  }
</script>

<section class="p-4">
  <div class="flex items-center gap-2 mb-4">
    <Button onclick={() => onOpenChange(true)}>{t('orders.new')}</Button>
    <NewSaleDialog bind:open={showDialog} {products} onSubmit={submitSale} />
  </div>

  <div class="mb-4">
    <h2 class="font-semibold mb-2">{t('orders.recent')}</h2>
    <RecentOrders limit={5} />
  </div>
</section>


