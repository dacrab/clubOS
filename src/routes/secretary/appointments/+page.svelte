<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  let list: Array<any> = $state([]);
  let form = $state({ customer_name: '', contact_info: '', appointment_date: '', num_children: 1, num_adults: 0, notes: '' });
  
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
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Appointments</h1>
  <div class="grid gap-3 max-w-xl">
    <input class="border p-2 rounded" placeholder="Customer name" bind:value={form.customer_name} />
    <input class="border p-2 rounded" placeholder="Contact info" bind:value={form.contact_info} />
    <input type="datetime-local" class="border p-2 rounded" bind:value={form.appointment_date} />
    <div class="flex gap-2">
      <input type="number" min="1" class="border p-2 rounded w-24" bind:value={form.num_children} />
      <input type="number" min="0" class="border p-2 rounded w-24" bind:value={form.num_adults} />
    </div>
    <textarea class="border p-2 rounded" placeholder="Notes" bind:value={form.notes}></textarea>
    <button class="border rounded px-3 py-1" onclick={create}>Create</button>
  </div>
  <h2 class="font-semibold mt-6">Upcoming</h2>
  <ul class="text-sm space-y-1">
    {#each list as a}
      <li> {new Date(a.appointment_date).toLocaleString()} — {a.customer_name} ({a.contact_info}) — kids {a.num_children}, adults {a.num_adults}</li>
    {/each}
  </ul>
</section>


