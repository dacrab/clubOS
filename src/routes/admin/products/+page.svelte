<script lang="ts">
import { Package, Pencil } from "@lucide/svelte";
import PageContent from "$lib/components/common/PageContent.svelte";
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

<PageContent>
  <PageHeader title={t("pages.products.title")} icon={Package}>
    <Button type="button" variant="outline" class="rounded-full" onclick={() => (showAdd = true)}>
      {t("pages.products.add")}
    </Button>
    <Button type="button" variant="ghost" class="rounded-full" onclick={() => (showCategories = true)}>
      {t("pages.products.manageCategories")}
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-4">
    <SearchBar bind:value={search} placeholder={t("orders.search") ?? ""} />

    <Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
      <div class="overflow-x-auto">
        <Table class="min-w-full">
          <TableHeader>
            <TableRow class="border-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <TableHead class="w-[72px] rounded-l-2xl bg-surface-strong/60">{t("common.image")}</TableHead>
              <TableHead class="bg-surface-strong/60">{t("common.name")}</TableHead>
              <TableHead class="bg-surface-strong/60 text-right">{t("common.price")}</TableHead>
              <TableHead class="bg-surface-strong/60 text-center">{t("common.stock")}</TableHead>
              <TableHead class="rounded-r-2xl bg-surface-strong/60 text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each filtered() as product}
              <TableRow class="border-b border-outline-soft/40 text-sm">
                <TableCell>
                  {#if product.image_url}
                    <img src={product.image_url} alt={product.name} class="size-10 rounded-lg object-cover" loading="lazy" />
                  {:else}
                    <div class="grid size-10 place-items-center rounded-lg border border-outline-soft/60 text-xs text-muted-foreground">
                      —
                    </div>
                  {/if}
                </TableCell>
                <TableCell class="max-w-[320px] truncate">
                  <div class="font-medium text-foreground">{product.name}</div>
                  {#if product.stock_quantity !== -1 && product.stock_quantity <= 3}
                    <span class="text-xs text-muted-foreground">{t("inventory.low")}</span>
                  {/if}
                </TableCell>
                <TableCell class="text-right font-medium text-foreground">
                  €{Number(product.price).toFixed(2)}
                </TableCell>
                <TableCell class="text-center text-sm text-muted-foreground">
                  {product.stock_quantity === -1 ? "∞" : String(product.stock_quantity)}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="rounded-full border border-outline-soft"
                    onclick={() => openEdit(product)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil class="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>

  <AddProductDialog bind:open={showAdd} {categories} onCreate={onCreate} />
  <EditProductDialog bind:open={showEdit} product={selected} {categories} onSave={onSave} onUploadImage={onUploadImage} />
  <ManageCategoriesDialog bind:open={showCategories} bind:categories />
</PageContent>


