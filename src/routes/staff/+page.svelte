<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  import { t } from '$lib/i18n';
  import OpenRegister from './OpenRegister.svelte';
  import { Clock, ShoppingCart, ReceiptText, ClipboardList, LogOut } from '@lucide/svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  import StatsCards from '$lib/components/common/StatsCards.svelte';

  let closing = $state(false);
  let recentCount = $state(0);
  let todayTotal = $state(0);
  let shiftTime = $state(0);

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'staff') window.location.href = '/dashboard';
    });
  });

  $effect(() => { loadCounts(); });

  async function loadCounts() {
    const { count } = await supabase.from('orders').select('*', { head: true, count: 'exact' });
    recentCount = count ?? 0;

    // Get today's sales
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { data } = await supabase.from('orders').select('total_amount').gte('created_at', startOfDay.toISOString());
    todayTotal = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);

    // Get shift time (mock calculation for now)
    const now = new Date();
    const startOfShift = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM
    const shiftDuration = Math.max(0, (now.getTime() - startOfShift.getTime()) / (1000 * 60 * 60)); // hours
    shiftTime = Math.round(shiftDuration * 10) / 10; // round to 1 decimal
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

<section class="space-y-8">
  <!-- Welcome Header -->
  <div class="text-center space-y-4 pb-2">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-4">
      <ShoppingCart class="w-8 h-8 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">{t('dashboard.staff.title')}</h1>
      <p class="text-muted-foreground text-lg">Ready to serve customers and process sales</p>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card class="card-hover bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/20">
      <CardContent class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
            <ShoppingCart class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">{recentCount}</p>
            <p class="text-sm text-blue-600 dark:text-blue-400">Total Orders</p>
          </div>
        </div>
        <h3 class="font-semibold text-blue-800 dark:text-blue-200">{t('orders.recent')}</h3>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
            <ReceiptText class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</p>
            <p class="text-sm text-muted-foreground">Today's Sales</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
            <Clock class="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{shiftTime}h</p>
            <p class="text-sm text-muted-foreground">Shift Time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Main Actions -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Point of Sale -->
    <Card class="card-hover bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader class="pb-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShoppingCart class="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle class="text-xl">{t('dashboard.staff.pos')}</CardTitle>
            <p class="text-sm text-muted-foreground">Process customer transactions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <Button href="/orders" size="lg" class="w-full h-14 rounded-xl text-base font-medium">
          <ShoppingCart class="mr-3 h-5 w-5" />
          Start New Sale
        </Button>
        </CardContent>
    </Card>

    <!-- Register Management -->
    <Card class="card-hover">
      <CardHeader class="pb-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <ClipboardList class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle class="text-xl">{t('dashboard.staff.register')}</CardTitle>
            <p class="text-sm text-muted-foreground">Manage cash register sessions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4 pt-0">
        <OpenRegister />
        <Button
          onclick={onCloseRegister}
          disabled={closing}
          variant="destructive"
          class="w-full h-12 rounded-lg"
        >
          <LogOut class="mr-2 h-4 w-4" />
          {closing ? t('dashboard.admin.closing') : t('dashboard.staff.closeRegister')}
        </Button>
      </CardContent>
    </Card>
  </div>

  <!-- Recent Activity -->
  <Card class="card-hover">
    <CardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-xl">Recent Activity</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">Latest transactions and activities</p>
        </div>
        <Button variant="ghost" size="sm" href="/admin/reports">
          View All
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <RecentOrders limit={5} />
    </CardContent>
  </Card>
</section>


