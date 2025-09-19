<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  let todayTotal = $state(0);
  let closing = $state(false);
  import Button from '$lib/components/ui/button/button.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import { t } from '$lib/i18n';
  import LowStockCard from '$lib/components/LowStockCard.svelte';

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

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 flex-wrap">
      <Button variant="outline" href="/admin/reports">{t('nav.reports')}</Button>
      <Button variant="outline" href="/secretary/appointments">{t('nav.appointments')}</Button>
      <Button variant="outline" href="/secretary/football">{t('nav.football')}</Button>
    </div>
    <Button href="/orders">{t('orders.new')}</Button>
  </div>

  <h1 class="text-2xl font-semibold">{t('dashboard.admin.title')}</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card>
      <CardHeader><CardTitle>{t('dashboard.admin.revenue')}</CardTitle></CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">€{todayTotal.toFixed(2)}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{t('orders.recent')}</CardTitle></CardHeader>
      <CardContent>
        <RecentOrders limit={5} />
      </CardContent>
    </Card>
     <Card>
      <CardHeader><CardTitle>{t('common.actions')}</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <Button href="/admin/registers">{t('dashboard.admin.manageRegisters')}</Button>
        <Button onclick={onCloseRegister} disabled={closing}>{closing ? t('dashboard.admin.closing') : t('dashboard.admin.closeRegister')}</Button>
      </CardContent>
    </Card>
    <div class="md:col-span-2">
      <LowStockCard threshold={10} />
    </div>
  </div>
</section>


