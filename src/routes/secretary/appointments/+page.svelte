<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  let list: Array<any> = $state([]);
  let form = $state({ customer_name: '', contact_info: '', appointment_date: '', num_children: 1, num_adults: 0, notes: '' });
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
      .from('appointments')
      .select('*')
      .order('appointment_date');
    list = (data as any) ?? [];
  }
  
  async function create() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const payload = { ...form, appointment_date: new Date(form.appointment_date), created_by: user.id };
    const { error } = await supabase.from('appointments').insert(payload);
    if (!error) {
      form = { customer_name: '', contact_info: '', appointment_date: '', num_children: 1, num_adults: 0, notes: '' } as any;
      load();
    }
  }
  
  async function setStatus(id: string, status: 'confirmed'|'cancelled'|'completed') {
    await supabase.from('appointments').update({ status }).eq('id', id);
    await load();
  }
</script>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold">Appointments</h1>
  <div class="grid gap-3 max-w-xl">
    <input class="border p-2 rounded" placeholder="Customer name" bind:value={form.customer_name} />
    <input class="border p-2 rounded" placeholder="Contact info" bind:value={form.contact_info} />
    <input type="datetime-local" class="border p-2 rounded" bind:value={form.appointment_date} />
    <div class="flex gap-2">
      <input type="number" min="1" class="border p-2 rounded w-24" bind:value={form.num_children} />
      <input type="number" min="0" class="border p-2 rounded w-24" bind:value={form.num_adults} />
    </div>
    <textarea class="border p-2 rounded" placeholder="Notes" bind:value={form.notes}></textarea>
    <Button onclick={create}>Create</Button>
  </div>
  <h2 class="font-semibold mt-6">Upcoming</h2>
  <ul class="text-sm space-y-1">
    {#each list as a}
      <li>
        {new Date(a.appointment_date).toLocaleString()} — {a.customer_name} ({a.contact_info}) — kids {a.num_children}, adults {a.num_adults}
        {#if (new Date(a.appointment_date).getTime() - Date.now()) <= 7 * 24 * 60 * 60 * 1000}
          <span class="ml-2 text-xs bg-yellow-100 px-2 py-0.5 rounded">Reminder in 1w</span>
        {/if}
        <span class="ml-2">[{a.status}]</span>
        <span class="ml-2">
          <Button variant="outline" onclick={() => setStatus(a.id, 'confirmed')}>Confirm</Button>
          <Button variant="outline" onclick={() => setStatus(a.id, 'completed')}>Complete</Button>
          <Button variant="outline" onclick={() => setStatus(a.id, 'cancelled')}>Cancel</Button>
        </span>
      </li>
    {/each}
  </ul>
</section>


