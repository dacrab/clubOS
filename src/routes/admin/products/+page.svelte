<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  
  type Product = { id: string; name: string; price: number; stock_quantity: number; category_id: string | null; image_url?: string | null };
  type Category = { id: string; name: string };
  let products: Product[] = $state([] as Product[]);
  let categories: Category[] = $state([] as Category[]);
  let form = $state({ name: '', price: 0, stock_quantity: 0, category_id: '' });
  let uploadingFor: string | null = $state(null);
  import Button from '$lib/components/ui/button/button.svelte';

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

  async function onSelectImage(e: Event, productId: string) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    uploadingFor = productId;
    try {
      const path = `product-${productId}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (upErr) return;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      const url = pub.publicUrl;
      await supabase.from('products').update({ image_url: url }).eq('id', productId);
      await loadLists();
    } finally {
      uploadingFor = null;
      (e.target as HTMLInputElement).value = '';
    }
  }
</script>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold">Products</h1>
  <div class="grid gap-3 md:max-w-xl">
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
    <Button onclick={createProduct}>Create</Button>
  </div>

  <h2 class="font-semibold mt-6">All products</h2>
  <table class="text-sm w-full border rounded-md overflow-hidden">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left p-2">Name</th>
        <th class="text-left p-2">Price</th>
        <th class="text-left p-2">Stock</th>
        <th class="text-left p-2">Image</th>
      </tr>
    </thead>
    <tbody>
      {#each products as p}
        <tr class="border-t {p.stock_quantity !== -1 && p.stock_quantity <= 3 ? 'bg-red-50' : ''}">
          <td class="p-2">{p.name} {#if p.stock_quantity !== -1 && p.stock_quantity <= 3}<span class="ml-1 text-xs text-red-700">low</span>{/if}</td>
          <td class="p-2">€{Number(p.price).toFixed(2)}</td>
          <td class="p-2">{p.stock_quantity}</td>
          <td class="p-2">
            {#if p.image_url}
              <img src={p.image_url} alt={p.name} class="h-10 w-10 object-cover inline-block mr-2" />
            {/if}
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <Button variant="outline">{uploadingFor===p.id ? '...' : 'Upload'}</Button>
              <input class="hidden" type="file" accept="image/*" onchange={(e) => onSelectImage(e, p.id)} />
            </label>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>


