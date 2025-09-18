<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  
  type Product = { id: string; name: string; price: number; stock_quantity: number; category_id: string | null };
  type Category = { id: string; name: string };
  let products: Product[] = $state([] as Product[]);
  let categories: Category[] = $state([] as Category[]);
  let form = $state({ name: '', price: 0, stock_quantity: 0, category_id: '' });

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      loadLists();
    });
  });

  async function loadLists() {
    const { data: pcats } = await supabase.from('categories').select('id,name').order('name');
    categories = (pcats as any) ?? [];
    const { data: prods } = await supabase.from('products').select('id,name,price,stock_quantity,category_id').order('name');
    products = (prods as any) ?? [];
  }

  async function createProduct() {
    const payload = { ...form, price: Number(form.price), stock_quantity: Number(form.stock_quantity) };
    const { error } = await supabase.from('products').insert(payload);
    if (!error) {
      form = { name: '', price: 0, stock_quantity: 0, category_id: '' };
      await loadLists();
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Products</h1>
  <div class="grid gap-3 max-w-xl">
    <input class="border p-2 rounded" placeholder="Name" bind:value={form.name} />
    <div class="flex gap-2">
      <input type="number" step="0.01" class="border p-2 rounded w-40" placeholder="Price" bind:value={form.price} />
      <input type="number" class="border p-2 rounded w-40" placeholder="Stock" bind:value={form.stock_quantity} />
    </div>
    <select class="border p-2 rounded" bind:value={form.category_id}>
      <option value="">No category</option>
      {#each categories as c}
        <option value={c.id}>{c.name}</option>
      {/each}
    </select>
    <button class="border rounded px-3 py-1" onclick={createProduct}>Create</button>
  </div>

  <h2 class="font-semibold mt-6">All products</h2>
  <table class="text-sm w-full border">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left p-2">Name</th>
        <th class="text-left p-2">Price</th>
        <th class="text-left p-2">Stock</th>
      </tr>
    </thead>
    <tbody>
      {#each products as p}
        <tr class="border-t">
          <td class="p-2">{p.name}</td>
          <td class="p-2">€{Number(p.price).toFixed(2)}</td>
          <td class="p-2">{p.stock_quantity}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>


