<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  import { t } from '$lib/i18n';
  import OpenRegister from './OpenRegister.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import RecentOrders from '$lib/components/RecentOrders.svelte';
  
  let closing = $state(false);
  
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'staff') window.location.href = '/dashboard';
    });
  });
  
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
  <h1 class="text-2xl font-semibold">Staff Dashboard</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <CardHeader><CardTitle>Point of Sale</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <Button href="/orders" size="lg">New Sale</Button>
      </CardContent>
    </Card>
    <Card>
        <CardHeader><CardTitle>{t('orders.recent')}</CardTitle></CardHeader>
        <CardContent>
            <RecentOrders limit={5} />
        </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Register</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <OpenRegister />
        <Button onclick={onCloseRegister} disabled={closing} variant="destructive">{closing ? '...' : 'Close Register'}</Button>
      </CardContent>
    </Card>
  </div>
</section>


