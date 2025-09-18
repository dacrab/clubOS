<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession, closeRegister } from '$lib/register';
  let closing = $state(false);
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
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

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Admin Dashboard</h1>
  <ul class="list-disc pl-5">
    <li>KPIs and recent sales (to implement)</li>
    <li>Manage products & categories</li>
    <li>Manage bookings</li>
    <li>Manage users</li>
    <li>
      Register sessions — <button class="border rounded px-2" onclick={onCloseRegister} disabled={closing}>{closing ? '...' : 'Close register'}</button>
    </li>
  </ul>
</section>


