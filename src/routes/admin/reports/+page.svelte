<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';

  let todayTotal = $state(0);
  let weekTotal = $state(0);
  let topProducts = $state([] as Array<{ name: string; qty: number; revenue: number }>);
  let series = $state([] as Array<{ day: string; total: number }>);

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

    // 7 day series (client-side rollup)
    const { data: last7 } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', startOfWeek.toISOString())
      .order('created_at');
    const dayMap = new Map<string, number>();
    (last7 ?? []).forEach((o: any) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(o.total_amount));
    });
    series = Array.from(dayMap.entries()).map(([day, total]) => ({ day, total }));

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

  <h2 class="font-semibold mt-6">Revenue (7d)</h2>
  <div class="grid gap-2 max-w-2xl">
    {#each series as s}
      <div class="flex items-center gap-2 text-sm">
        <div class="w-24">{s.day}</div>
        <div class="flex-1 bg-gray-100 h-3 rounded">
          <div class="bg-black h-3 rounded" style={`width:${Math.min(100, (s.total / Math.max(1, weekTotal)) * 100)}%`}></div>
        </div>
        <div class="w-20 text-right">€{s.total.toFixed(2)}</div>
      </div>
    {/each}
  </div>
</section>
