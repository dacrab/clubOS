<script lang="ts">
 
import { Package, Pencil, Plus, Settings2 } from "@lucide/svelte";
import SearchBar from "$lib/components/common/search-bar.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table";
import { facilityState } from "$lib/state/facility.svelte";
import { t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";
import AddProductDialog from "./add-product-dialog.svelte";
import EditProductDialog from "./edit-product-dialog.svelte";
import ManageCategoriesDialog from "./manage-categories-dialog.svelte";

interface Product {
	id: string;
	name: string;
	price: number;
	stock_quantity: number;
	category_id: string | null;
	image_url?: string | null;
}

interface Category {
	id: string;
	name: string;
}

let products: Product[] = $state([]);
let categories: Category[] = $state([]);
let search = $state("");
let showAdd = $state(false);
let showEdit = $state(false);
let showCategories = $state(false);
let selected: Product | null = $state(null);

const filteredProducts = $derived.by(() => {
	const s = search.trim().toLowerCase();
	if (!s) return products;
	return products.filter((p) => p.name.toLowerCase().includes(s));
});

// Virtualization
let scrollRef: HTMLDivElement | null = null;
const ROW_HEIGHT = 64;
const VIEW_BUFFER_ROWS = 6;
const VIEWPORT_HEIGHT = 600;
let startIndex = $state(0);
let endIndex = $state(0);
const topPad = $derived(startIndex * ROW_HEIGHT);
const bottomPad = $derived(Math.max(0, (filteredProducts.length - endIndex) * ROW_HEIGHT));

function recomputeWindow() {
	const scrollTop = scrollRef?.scrollTop ?? 0;
	const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - Math.ceil(VIEW_BUFFER_ROWS / 2));
	startIndex = first;
	endIndex = Math.min(filteredProducts.length, first + visibleCount);
}

$effect(() => {
	recomputeWindow(); // Recalc when filtered changes
});

$effect(() => {
	if (typeof window !== "undefined") {
		void userState.load().then(loadLists);
	}
});

async function loadLists() {
	const facilityId = await facilityState.resolveSelected();
	if (!facilityId) {
		categories = [];
		products = [];
		return;
	}
	const [{ data: pcats }, { data: prods }] = await Promise.all([
		supabase.from("categories").select("id,name").eq("facility_id", facilityId).order("name"),
		supabase.from("products").select("*").eq("facility_id", facilityId).order("name"),
	]);
	categories = (pcats as Category[] | null) ?? [];
	products = (prods as Product[] | null) ?? [];
	startIndex = 0;
	endIndex = Math.min(products.length, Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS);
}

async function onCreate(payload: {
	name: string;
	price: number;
	stock_quantity: number;
	category_id: string | null;
}): Promise<void> {
	const { toast } = await import("svelte-sonner");
	const tenantId = userState.current?.tenantIds?.[0];
	const fid = await facilityState.resolveSelected();
	const { error } = await supabase
		.from("products")
		.insert({ ...payload, tenant_id: tenantId, facility_id: fid });
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
	const { toast } = await import("svelte-sonner");
	const { error } = await supabase
		.from("products")
		.update({
			name: payload.name,
			price: payload.price,
			stock_quantity: payload.stock_quantity,
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
	const { data: sessionData } = await supabase.auth.getUser();
	const userId = sessionData.user?.id ?? "";
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", userId);
	const tenantId = (memberships?.[0] as { tenant_id: string } | undefined)?.tenant_id ?? "unknown";
	const path = `tenant-${tenantId}/product-${productId}-${Date.now().toString()}-${file.name}`;
	await supabase.storage.from("product-images").upload(path, file, { upsert: true });
	const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
	await supabase.from("products").update({ image_url: pub.publicUrl }).eq("id", productId);
	await loadLists();
}

function openEdit(p: Product) {
	selected = p;
	showEdit = true;
}
</script>

<PageContent>
  <PageHeader title={t("products.title")}>
    <Button variant="outline" class="gap-2" onclick={() => (showCategories = true)}>
      <Settings2 class="size-4" />
      {t("products.manageCategories")}
    </Button>
    <Button class="gap-2" onclick={() => (showAdd = true)}>
      <Plus class="size-4" />
      {t("products.add")}
    </Button>
  </PageHeader>

  <div class="space-y-4">
    <SearchBar bind:value={search} placeholder={t("orders.search")} class="max-w-sm" />

    <Card class="overflow-hidden border-border shadow-sm">
      <div
        bind:this={scrollRef}
        onscroll={recomputeWindow}
        style="max-height: {VIEWPORT_HEIGHT}px; overflow-y: auto;"
      >
        <Table>
          <TableHeader class="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow class="hover:bg-transparent border-b border-border/60">
              <TableHead class="w-[80px]">{t("common.image")}</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead class="text-right">{t("common.price")}</TableHead>
              <TableHead class="text-center w-[100px]">{t("common.stock")}</TableHead>
              <TableHead class="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#if filteredProducts.length === 0}
              <TableRow>
                <TableCell colspan={5} class="h-96 text-center">
                  <div class="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package class="size-8 opacity-50" />
                    <p>{t(search ? "common.emptyState.title" : "products.empty.title")}</p>
                  </div>
                </TableCell>
              </TableRow>
            {:else}
              {#if topPad > 0}
                <tr><td colspan={5} style="height: {topPad}px;"></td></tr>
              {/if}
              
              {#each filteredProducts.slice(startIndex, endIndex) as product (product.id)}
                <TableRow class="h-16">
                  <TableCell>
                    <div class="size-10 overflow-hidden rounded-md border bg-muted/20">
                      {#if product.image_url}
                        <img src={product.image_url} alt={product.name} class="size-full object-cover" loading="lazy" />
                      {:else}
                        <div class="grid size-full place-items-center text-muted-foreground/50">
                          <Package class="size-5" />
                        </div>
                      {/if}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-medium">{product.name}</span>
                      {#if product.stock_quantity !== -1 && product.stock_quantity <= 3}
                        <span class="text-xs text-destructive font-medium">{t("inventory.low")}</span>
                      {/if}
                    </div>
                  </TableCell>
                  <TableCell class="text-right font-medium">
                    €{product.price.toFixed(2)}
                  </TableCell>
                  <TableCell class="text-center">
                    {#if product.stock_quantity === -1}
                      <span class="text-muted-foreground">∞</span>
                    {:else}
                      <span class={product.stock_quantity <= 3 ? "text-destructive font-medium" : ""}>
                        {product.stock_quantity}
                      </span>
                    {/if}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onclick={() => {
                        openEdit(product);
                      }}
                    >
                      <Pencil class="size-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              {/each}

              {#if bottomPad > 0}
                <tr><td colspan={5} style="height: {bottomPad}px;"></td></tr>
              {/if}
            {/if}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>

  <AddProductDialog bind:open={showAdd} {categories} {onCreate} />
  <EditProductDialog bind:open={showEdit} product={selected} {categories} {onSave} {onUploadImage} />
  <ManageCategoriesDialog bind:open={showCategories} bind:categories />
</PageContent>
