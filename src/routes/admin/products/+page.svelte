<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  import PageHeader from '$lib/components/common/PageHeader.svelte';
  import SearchBar from '$lib/components/common/SearchBar.svelte';
  import DataTable, { type Column } from '$lib/components/common/DataTable.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import AddProductDialog from './AddProductDialog.svelte';
  import EditProductDialog from './EditProductDialog.svelte';
  import ManageCategoriesDialog from './ManageCategoriesDialog.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import { t } from '$lib/i18n';

  type Product = { id: string; name: string; price: number; stock_quantity: number; category_id: string | null; image_url?: string | null };
  type Category = { id: string; name: string };
  let products: Product[] = $state([] as Product[]);
  let categories: Category[] = $state([] as Category[]);
  let search = $state('');

  let showAdd = $state(false);
  let showEdit = $state(false);
  let showCategories = $state(false);
  let selected: Product | null = $state(null);

  $effect(() => {
    if (typeof window === 'undefined') return;
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
    const { data: prods } = await supabase.from('products').select('id,name,price,stock_quantity,category_id,image_url').order('name');
    products = (prods as any) ?? [];
  }

  async function onCreate(payload: { name: string; price: number; stock_quantity: number; category_id: string | null }) {
    const { error } = await supabase.from('products').insert(payload);
    if (!error) await loadLists();
  }

  async function onSave(payload: { id: string; name: string; price: number; stock_quantity: number; category_id: string | null }) {
    const { error } = await supabase.from('products').update({
      name: payload.name,
      price: Number(payload.price),
      stock_quantity: Number(payload.stock_quantity),
      category_id: payload.category_id
    }).eq('id', payload.id);
    if (!error) await loadLists();
  }

  async function onUploadImage(file: File, productId: string) {
    const path = `product-${productId}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (upErr) return;
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from('products').update({ image_url: url }).eq('id', productId);
    await loadLists();
  }

  function filtered() {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter(p => p.name.toLowerCase().includes(s));
  }

  const columns: Array<Column<Product>> = [
    { key: 'name', header: t('common.name'), cell: (p) => `${p.name}${p.stock_quantity !== -1 && p.stock_quantity <= 3 ? '  • low' : ''}` },
    { key: 'price', header: t('common.price'), cell: (p) => `€${Number(p.price).toFixed(2)}`, align: 'right' },
    { key: 'stock_quantity', header: t('common.stock'), cell: (p) => (p.stock_quantity === -1 ? '∞' : String(p.stock_quantity)), align: 'center' },
    { key: 'image_url', header: t('common.image'), cell: (p) => p.image_url ? `<img src=\"${p.image_url}\" alt=\"${p.name}\" class=\"h-10 w-10 object-cover rounded\" />` : '', align: 'center' },
    { key: 'id', header: t('common.actions'), cell: (p) => {
      return {
        $$render() {
          return `<div class=\"text-right\"><button class=\"inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm hover:bg-accent\" onclick=\"__edit('${p.id}')\">${t('common.edit')}</button></div>`;
        }
      } as any;
    }, align: 'right' },
  ];

  // Bridge function for DataTable action rendering (client only)
  if (typeof window !== 'undefined') {
    (window as any).__edit = (id: string) => {
      const row = products.find(x => x.id === id) || null;
      selected = row;
      showEdit = !!row;
    };
  }
</script>

<section class="space-y-4">
  <PageHeader title={t('pages.products.title')}>
    <Button variant="outline" onclick={() => showAdd = true}>{t('pages.products.add')}</Button>
    <Button variant="ghost" onclick={() => (showCategories = true)}>Manage Categories</Button>
  </PageHeader>

  <div class="flex items-center gap-2">
    <SearchBar bind:value={search} placeholder={t('orders.search')} />
  </div>

  <Card>
    <DataTable {columns} rows={filtered()} />
  </Card>

  <AddProductDialog bind:open={showAdd} {categories} onCreate={onCreate} />
  <EditProductDialog bind:open={showEdit} product={selected} {categories} onSave={onSave} onUploadImage={onUploadImage} />
  <ManageCategoriesDialog bind:open={showCategories} bind:categories />
</section>


