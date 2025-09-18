<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  
  type Category = { id: string; name: string; description: string | null };
  let categories: Category[] = $state([] as Category[]);
  let form = $state({ name: '', description: '' });

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      load();
    });
  });

  async function load() {
    const { data } = await supabase.from('categories').select('id,name,description').order('name');
    categories = (data as any) ?? [];
  }

  async function createCategory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    const payload = { name: form.name, description: form.description, created_by: user.id };
    const { error } = await supabase.from('categories').insert(payload);
    if (!error) {
      form = { name: '', description: '' };
      await load();
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Categories</h1>
  <div class="grid gap-3 max-w-xl">
    <input class="border p-2 rounded" placeholder="Name" bind:value={form.name} />
    <input class="border p-2 rounded" placeholder="Description" bind:value={form.description} />
    <button class="border rounded px-3 py-1" onclick={createCategory}>Create</button>
  </div>
  <h2 class="font-semibold mt-6">All categories</h2>
  <ul class="text-sm space-y-1">
    {#each categories as c}
      <li> {c.name} — <span class="opacity-70">{c.description}</span></li>
    {/each}
  </ul>
</section>


