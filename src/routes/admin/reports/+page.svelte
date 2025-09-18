<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';

  let todayTotal = $state(0);
  let weekTotal = $state(0);
  let topProducts = $state([] as Array<{ name: string; qty: number; revenue: number }>);

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      loadKPIs();
    });
  });

  async function loadKPIs() {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const { data: today } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', startOfDay.toISOString());
    todayTotal = (today ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);

    const { data: week } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', startOfWeek.toISOString());
    weekTotal = (week ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, line_total, product_id, products(name)')
      .gte('created_at', startOfWeek.toISOString());
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    (items ?? []).forEach((it: any) => {
      const key = it.product_id;
      const prev = map.get(key) ?? { name: it.products?.name ?? 'N/A', qty: 0, revenue: 0 };
      prev.qty += Number(it.quantity);
      prev.revenue += Number(it.line_total);
      map.set(key, prev);
    });
    topProducts = Array.from(map.values()).sort((a,b) => b.revenue - a.revenue).slice(0,5);
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Reports</h1>
  <div class="grid grid-cols-2 gap-4 max-w-2xl">
    <div class="border rounded p-4">
      <div class="text-sm opacity-70">Today</div>
      <div class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</div>
    </div>
    <div class="border rounded p-4">
      <div class="text-sm opacity-70">Last 7 days</div>
      <div class="text-2xl font-semibold">€{weekTotal.toFixed(2)}</div>
    </div>
  </div>

  <h2 class="font-semibold">Top products (7d)</h2>
  <table class="text-sm w-full border max-w-2xl">
    <thead>
      <tr class="bg-gray-50"><th class="text-left p-2">Product</th><th class="text-left p-2">Qty</th><th class="text-left p-2">Revenue</th></tr>
    </thead>
    <tbody>
      {#each topProducts as p}
        <tr class="border-t"><td class="p-2">{p.name}</td><td class="p-2">{p.qty}</td><td class="p-2">€{p.revenue.toFixed(2)}</td></tr>
      {/each}
    </tbody>
  </table>
</section>
