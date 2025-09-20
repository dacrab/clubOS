<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  let appointmentsCount = $state(0);
  let footballCount = $state(0);

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      load();
    });
  });

  async function load() {
    const { count: ac } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
    appointmentsCount = ac ?? 0;
    const { count: fc } = await supabase.from('football_bookings').select('*', { count: 'exact', head: true });
    footballCount = fc ?? 0;
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Bookings Management</h1>
  <div class="grid grid-cols-2 gap-4 max-w-2xl">
    <a href="/secretary/appointments" class="border rounded p-4 block">
      <div class="text-sm opacity-70">Appointments</div>
      <div class="text-2xl font-semibold">{appointmentsCount}</div>
    </a>
    <a href="/secretary/football" class="border rounded p-4 block">
      <div class="text-sm opacity-70">Football bookings</div>
      <div class="text-2xl font-semibold">{footballCount}</div>
    </a>
  </div>
</section>