<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  import { t } from '$lib/i18n';
  import OpenRegister from './OpenRegister.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  
  let recent: Array<{ id: string; total_amount: number; created_at: string }> = $state([]);
  let closing = $state(false);
  
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'staff') window.location.href = '/dashboard';
    });
    loadRecent();
  });
  
  async function loadRecent() {
    const { data } = await supabase
      .from('orders')
      .select('id,total_amount,created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    recent = (data as any) ?? [];
  }
  
  async function onCloseRegister() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const sessionId = await ensureOpenSession(supabase, user.id);
    closing = true;
    try {
      await closeRegister(supabase, sessionId, null);
      await loadRecent();
    } finally {
      closing = false;
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Staff Dashboard</h1>
  <ul class="list-disc pl-5">
    <li>Sales entry</li>
    <li><Button href="/orders">New sale</Button></li>
    <li>
      <div class="mb-2">{t('orders.recent')}</div>
      <ul class="text-sm space-y-1">
        {#each recent as r}
          <li>#{r.id.slice(0,8)} — €{Number(r.total_amount).toFixed(2)} — {new Date(r.created_at).toLocaleString()}</li>
        {/each}
      </ul>
    </li>
    <li>
      <Button onclick={onCloseRegister} disabled={closing}>{closing ? '...' : 'Close register'}</Button>
    </li>
  </ul>
  <div class="mt-6 grid gap-3 max-w-md">
    <h2 class="font-semibold">Open register</h2>
    <OpenRegister />
  </div>
</section>


