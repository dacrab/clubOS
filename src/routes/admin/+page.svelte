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
  import StatsCards from '$lib/components/common/StatsCards.svelte';
  import PageHeader from '$lib/components/common/PageHeader.svelte';
  import { BarChart3, ReceiptText, Users, Package, ShoppingCart, ClipboardList, UserCog, LogOut } from '@lucide/svelte';

  let ordersCount = $state(0);
  let activeUsers = $state(0);
  let pendingTasks = $state(0);

  $effect(() => {
    if (typeof window === 'undefined') return;
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
    });
    loadToday();
    loadCounts();
  });

  async function loadToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { data } = await supabase.from('orders').select('total_amount').gte('created_at', startOfDay.toISOString());
    todayTotal = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);
  }

  async function loadCounts() {
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    ordersCount = count ?? 0;

    // Get active users count
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    activeUsers = usersCount ?? 0;

    // Get pending tasks count (using appointments as tasks for now)
    const { count: tasksCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');
    pendingTasks = tasksCount ?? 0;
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

<section class="space-y-12">
  <!-- Header -->
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <BarChart3 class="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold">{t('dashboard.admin.title')}</h1>
        <p class="text-muted-foreground">Overview of your business</p>
      </div>
    </div>
    <Button href="/orders" size="lg" class="gap-2">
      <ShoppingCart class="h-4 w-4" />
      {t('orders.new')}
    </Button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
            <ReceiptText class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</p>
            <p class="text-sm text-muted-foreground">{t('dashboard.admin.revenue')}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
            <Package class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{ordersCount}</p>
            <p class="text-sm text-muted-foreground">{t('orders.recent')}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
            <Users class="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{activeUsers}</p>
            <p class="text-sm text-muted-foreground">Active Users</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
            <ClipboardList class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{pendingTasks}</p>
            <p class="text-sm text-muted-foreground">Pending Tasks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Recent Orders -->
    <div class="lg:col-span-2">
      <Card class="card-hover">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>{t('orders.recent')}</CardTitle>
            <Button variant="ghost" size="sm" href="/admin/reports">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentOrders limit={5} />
        </CardContent>
      </Card>
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- Low Stock -->
      <LowStockCard threshold={10} />

      <!-- Quick Actions -->
      <Card>
        <CardHeader>
          <CardTitle>{t('common.actions')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button href="/admin/products" variant="ghost" class="w-full justify-start">
            <Package class="mr-2 h-4 w-4" />
            {t('nav.products')}
          </Button>
          <Button href="/admin/users" variant="ghost" class="w-full justify-start">
            <UserCog class="mr-2 h-4 w-4" />
            {t('nav.users')}
          </Button>
          <Button href="/admin/registers" variant="ghost" class="w-full justify-start">
            <ClipboardList class="mr-2 h-4 w-4" />
            {t('dashboard.admin.manageRegisters')}
          </Button>
          <Button variant="ghost" href="/admin/reports" class="w-full justify-start">
            <BarChart3 class="mr-2 h-4 w-4" />
            {t('nav.reports')}
          </Button>
          <div class="pt-2 border-t">
            <Button onclick={onCloseRegister} disabled={closing} variant="destructive" class="w-full justify-start">
              <LogOut class="mr-2 h-4 w-4" />
              {closing ? t('dashboard.admin.closing') : t('dashboard.admin.closeRegister')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</section>


