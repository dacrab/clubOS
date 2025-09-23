<script lang="ts">
import PageHeader from "$lib/components/common/PageHeader.svelte";
import SearchBar from "$lib/components/common/SearchBar.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";
import AddProductDialog from "./AddProductDialog.svelte";
import EditProductDialog from "./EditProductDialog.svelte";
import ManageCategoriesDialog from "./ManageCategoriesDialog.svelte";
import { Pencil } from "@lucide/svelte";

type Product = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category_id: string | null;
  image_url?: string | null;
};
type Category = { id: string; name: string };
let products: Product[] = $state([] as Product[]);
let categories: Category[] = $state([] as Category[]);
let search = $state("");

let showAdd = $state(false);
let showEdit = $state(false);
let showCategories = $state(false);
let selected: Product | null = $state(null);

$effect(() => {
  if (typeof window === "undefined") return;
  loadCurrentUser().then(() => {
    const u = $currentUser;
    if (!u) {
      window.location.href = "/login";
      return;
    }
    if (u.role !== "admin") window.location.href = "/dashboard";
    loadLists();
  });
});

async function loadLists() {
  const { data: pcats } = await supabase
    .from("categories")
    .select("id,name")
    .order("name");
  categories = (pcats as any) ?? [];
  const { data: prods } = await supabase
    .from("products")
    .select("id,name,price,stock_quantity,category_id,image_url")
    .order("name");
  products = (prods as any) ?? [];
}

async function onCreate(payload: {
  name: string;
  price: number;
  stock_quantity: number;
  category_id: string | null;
}): Promise<void> {
  const toast = (await import("svelte-sonner")).toast;
  const { error } = await supabase.from("products").insert(payload);
  if (error) {
    toast.error(error.message);
    return;
  }
  toast.success(t("common.save"));
  await loadLists();
}

async function onSave(payload: {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category_id: string | null;
}): Promise<void> {
  const toast = (await import("svelte-sonner")).toast;
  const { error } = await supabase
    .from("products")
    .update({
      name: payload.name,
      price: Number(payload.price),
      stock_quantity: Number(payload.stock_quantity),
      category_id: payload.category_id,
    })
    .eq("id", payload.id);
  if (error) {
    toast.error(error.message);
    return;
  }
  toast.success(t("common.save"));
  await loadLists();
}

async function onUploadImage(file: File, productId: string) {
  const path = `product-${productId}-${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });
  if (upErr) return;
  const { data: pub } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);
  const url = pub.publicUrl;
  await supabase
    .from("products")
    .update({ image_url: url })
    .eq("id", productId);
  await loadLists();
}

function filtered() {
  const s = search.trim().toLowerCase();
  if (!s) return products;
  return products.filter((p) => p.name.toLowerCase().includes(s));
}

function openEdit(p: Product) {
  selected = p;
  showEdit = true;
}
</script>

<section class="space-y-4">
  <PageHeader title={t('pages.products.title')}>
    <Button variant="outline" onclick={() => showAdd = true}>{t('pages.products.add')}</Button>
    <Button variant="ghost" onclick={() => (showCategories = true)}>{t('pages.products.manageCategories')}</Button>
  </PageHeader>

  <div class="flex items-center gap-2">
    <SearchBar bind:value={search} placeholder={t('orders.search')} />
  </div>

  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-[72px] text-base">{t('common.image')}</TableHead>
          <TableHead class="text-base">{t('common.name')}</TableHead>
          <TableHead class="text-right text-base">{t('common.price')}</TableHead>
          <TableHead class="text-center text-base">{t('common.stock')}</TableHead>
          <TableHead class="text-right text-base">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filtered() as p}
          <TableRow class="text-sm md:text-base">
            <TableCell>
              {#if p.image_url}
                <img src={p.image_url} alt={p.name} class="h-10 w-10 object-cover rounded" />
              {:else}
                <div class="h-10 w-10 rounded bg-muted grid place-items-center text-xs">—</div>
              {/if}
            </TableCell>
            <TableCell>
              <div class="truncate max-w-[360px]">
                {p.name}
                {#if p.stock_quantity !== -1 && p.stock_quantity <= 3}
                  <span class="text-xs text-muted-foreground"> • {t('inventory.low')}</span>
                {/if}
              </div>
            </TableCell>
            <TableCell class="text-right">€{Number(p.price).toFixed(2)}</TableCell>
            <TableCell class="text-center">{p.stock_quantity === -1 ? '∞' : String(p.stock_quantity)}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" onclick={() => openEdit(p)} aria-label={t('common.edit')}>
                <Pencil class="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </Card>

  <AddProductDialog bind:open={showAdd} {categories} onCreate={onCreate} />
  <EditProductDialog bind:open={showEdit} product={selected} {categories} onSave={onSave} onUploadImage={onUploadImage} />
  <ManageCategoriesDialog bind:open={showCategories} bind:categories />
</section>


