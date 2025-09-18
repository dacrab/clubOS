<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  let todayTotal = $state(0);
  let closing = $state(false);
  import Button from '$lib/components/ui/button/button.svelte';
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
    });
    loadToday();
  });

  async function loadToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { data } = await supabase.from('orders').select('total_amount').gte('created_at', startOfDay.toISOString());
    todayTotal = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);
  }

  async function onCloseRegister() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const sessionId = await ensureOpenSession(supabase, user.id);
    closing = true;
    try {
      await closeRegister(supabase, sessionId, null);
    } finally {
      closing = false;
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Admin Dashboard</h1>
  <div class="grid grid-cols-2 gap-4 max-w-2xl">
    <div class="border rounded p-4">
      <div class="text-sm opacity-70">Today</div>
      <div class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</div>
    </div>
    <div class="border rounded p-4">
      <div class="text-sm opacity-70">Recent orders</div>
      <RecentOrders limit={5} />
    </div>
  </div>
  <ul class="list-disc pl-5">
    <li>KPIs and recent sales (to implement)</li>
    <li>Manage products & categories</li>
    <li>Manage bookings</li>
    <li>Manage users</li>
    <li>
      Register sessions — <Button onclick={onCloseRegister} disabled={closing}>{closing ? '...' : 'Close register'}</Button>
    </li>
  </ul>
</section>


