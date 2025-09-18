<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  type Booking = { id: string; status: 'confirmed'|'cancelled'|'completed'; field_number: number; booking_datetime: string; customer_name: string; contact_info: string; num_players: number };
  let list: Booking[] = $state([] as Booking[]);
  let form = $state({ customer_name: '', contact_info: '', booking_datetime: '', field_number: 1, num_players: 10, notes: '' });
  import Button from '$lib/components/ui/button/button.svelte';
  
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'secretary' && u.role !== 'admin') window.location.href = '/dashboard';
      load();
    });
  });
  
  async function load() {
    const { data } = await supabase
      .from('football_bookings')
      .select('*')
      .order('booking_datetime');
    list = (data as any) ?? [];
  }
  
  async function create() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const payload = { ...form, booking_datetime: new Date(form.booking_datetime), created_by: user.id };
    const { error } = await supabase.from('football_bookings').insert(payload);
    if (!error) {
      form = { customer_name: '', contact_info: '', booking_datetime: '', field_number: 1, num_players: 10, notes: '' };
      load();
    }
  }

  async function setStatus(id: string, status: 'confirmed'|'cancelled'|'completed') {
    await supabase.from('football_bookings').update({ status }).eq('id', id);
    await load();
  }
</script>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold">Football Bookings</h1>
  <div class="grid gap-3 max-w-xl">
    <input class="border p-2 rounded" placeholder="Customer name" bind:value={form.customer_name} />
    <input class="border p-2 rounded" placeholder="Contact info" bind:value={form.contact_info} />
    <input type="datetime-local" class="border p-2 rounded" bind:value={form.booking_datetime} />
    <div class="flex gap-2">
      <input type="number" min="1" max="5" class="border p-2 rounded w-24" bind:value={form.field_number} />
      <input type="number" min="2" max="12" class="border p-2 rounded w-24" bind:value={form.num_players} />
    </div>
    <textarea class="border p-2 rounded" placeholder="Notes" bind:value={form.notes}></textarea>
    <Button onclick={create}>Create</Button>
  </div>
  <h2 class="font-semibold mt-6">Upcoming</h2>
  <ul class="text-sm space-y-1">
    {#each list as b}
      <li>Field {b.field_number} — {new Date(b.booking_datetime).toLocaleString()} — {b.customer_name} ({b.contact_info}) — players {b.num_players}
        <span class="ml-2">[{b.status}]</span>
        <span class="ml-2">
          <Button variant="outline" onclick={() => setStatus(b.id, 'confirmed')}>Confirm</Button>
          <Button variant="outline" onclick={() => setStatus(b.id, 'completed')}>Complete</Button>
          <Button variant="outline" onclick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
        </span>
      </li>
    {/each}
  </ul>
</section>


