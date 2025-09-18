<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';

  let sessions: Array<any> = $state([]);
  let openingCash = $state('');
  let closing = $state<string | null>(null);

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      load();
    });
  });

  async function load() {
    const { data } = await supabase
      .from('register_sessions')
      .select('id, opened_at, opened_by, closed_at, notes')
      .order('opened_at', { ascending: false })
      .limit(20);
    sessions = (data as any) ?? [];
  }

  async function openRegister() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const id = await ensureOpenSession(supabase, user.id);
    await supabase.from('register_sessions').update({ notes: { opening_cash: Number(openingCash || 0) } }).eq('id', id);
    openingCash = '';
    load();
  }

  async function closeSession(id: string) {
    closing = id;
    try {
      await closeRegister(supabase, id, null);
      await load();
    } finally {
      closing = null;
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Register Sessions</h1>
  <div class="flex items-center gap-2">
    <input class="border p-2 rounded w-40" type="number" step="0.01" placeholder="Opening cash €" bind:value={openingCash} />
    <button class="border rounded px-3 py-1" onclick={openRegister}>Open (or reuse open)</button>
  </div>

  <table class="text-sm w-full border mt-4">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left p-2">ID</th>
        <th class="text-left p-2">Opened</th>
        <th class="text-left p-2">Closed</th>
        <th class="text-left p-2">Opening cash</th>
        <th class="text-left p-2">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each sessions as s}
        <tr class="border-t">
          <td class="p-2">{s.id.slice(0,8)}</td>
          <td class="p-2">{new Date(s.opened_at).toLocaleString()}</td>
          <td class="p-2">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
          <td class="p-2">€{Number(s.notes?.opening_cash ?? 0).toFixed(2)}</td>
          <td class="p-2">
            {#if !s.closed_at}
              <button class="border rounded px-2 py-1" onclick={() => closeSession(s.id)} disabled={closing===s.id}>
                {closing===s.id ? '...' : 'Close'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>


