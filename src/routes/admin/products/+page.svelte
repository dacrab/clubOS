<script lang="ts">
import { Package, Pencil } from "@lucide/svelte";
import SearchBar from "$lib/components/common/search-bar.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import PageContent from "$lib/components/ui/page/page-content.svelte";
import PageHeader from "$lib/components/ui/page/page-header.svelte";
import Table from "$lib/components/ui/table/table.svelte";
import TableBody from "$lib/components/ui/table/table-body.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableHead from "$lib/components/ui/table/table-head.svelte";
import TableHeader from "$lib/components/ui/table/table-header.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";
import { currentUser, loadCurrentUser } from "$lib/user";
import AddProductDialog from "./add-product-dialog.svelte";
import EditProductDialog from "./edit-product-dialog.svelte";
import ManageCategoriesDialog from "./manage-categories-dialog.svelte";

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
// Virtualization state
let scrollRef: HTMLDivElement | null = null;
const ROW_HEIGHT = 56;
const VIEW_BUFFER_ROWS = 6;
const VIEWPORT_HEIGHT = 560;
let startIndex = $state(0);
let endIndex = $state(0);
const topPad = $derived(startIndex * ROW_HEIGHT);
const bottomPad = $derived(
	Math.max(0, (products.length - endIndex) * ROW_HEIGHT),
);

function recomputeWindow() {
	const scrollTop = scrollRef?.scrollTop ?? 0;
	const visibleCount =
		Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	const first = Math.max(
		0,
		Math.floor(scrollTop / ROW_HEIGHT) - Math.ceil(VIEW_BUFFER_ROWS / 2),
	);
	startIndex = first;
	endIndex = Math.min(products.length, first + visibleCount);
}
let categories: Category[] = $state([] as Category[]);
let search = $state("");

let showAdd = $state(false);
let showEdit = $state(false);
let showCategories = $state(false);
let selected: Product | null = $state(null);

$effect(() => {
	if (typeof window === "undefined") {
		return;
	}
	loadCurrentUser().then(() => {
		const u = $currentUser;
		if (!u) {
			window.location.href = "/login";
			return;
		}
		if (u.role !== "admin") {
			window.location.href = "/dashboard";
		}
		loadLists();
	});
});

async function loadLists() {
	const tenantId = $currentUser?.tenantIds?.[0];
	if (!tenantId) {
		return;
	}
	const { data: pcats } = await supabase
		.from("categories")
		.select("id,name")
		.eq("tenant_id", tenantId)
		.order("name");
	categories = (pcats as Category[] | null) ?? [];
	const { data: prods } = await supabase
		.from("products")
		.select("id,name,price,stock_quantity,category_id,image_url")
		.eq("tenant_id", tenantId)
		.order("name");
	products = (prods as Product[] | null) ?? [];
	// reset virtual window
	startIndex = 0;
	const visibleCount =
		Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	endIndex = Math.min(products.length, visibleCount);
}

async function onCreate(payload: {
	name: string;
	price: number;
	stock_quantity: number;
	category_id: string | null;
}): Promise<void> {
	const toast = (await import("svelte-sonner")).toast;
	const tenantId = $currentUser?.tenantIds?.[0];
	const { error } = await supabase
		.from("products")
		.insert({ ...payload, tenant_id: tenantId });
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
	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id ?? "";
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", userId);
	const tenantId = memberships?.[0]?.tenant_id as string;
	const path = `tenant-${tenantId}/product-${productId}-${Date.now()}-${file.name}`;
	const { error: upErr } = await supabase.storage
		.from("product-images")
		.upload(path, file, { upsert: true });
	if (upErr) {
		return;
	}
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
	if (!s) {
		return products;
	}
	return products.filter((p) => p.name.toLowerCase().includes(s));
}

function openEdit(p: Product) {
	selected = p;
	showEdit = true;
}

// Mark markup-only usages for Biome
((..._args: unknown[]) => {
	return;
})(
	Package,
	Pencil,
	PageContent,
	PageHeader,
	SearchBar,
	Button,
	Card,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	t,
	onCreate,
	onSave,
	onUploadImage,
	filtered,
	AddProductDialog,
	EditProductDialog,
	ManageCategoriesDialog,
	recomputeWindow,
	currentUser,
	openEdit,
);
</script>

<PageContent>
  <PageHeader title={t("pages.products.title")} icon={Package}>
    <Button type="button" class="rounded-lg" onclick={() => (showAdd = true)}>
      {t("pages.products.add")}
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="rounded-full px-4"
      onclick={() => (showCategories = true)}
    >
      {t("pages.products.manageCategories")}
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-4">
    <SearchBar bind:value={search} placeholder={t("orders.search") ?? ""} />

    <Card
      class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
    >
      <div class="overflow-x-auto">
        <div
          bind:this={scrollRef}
          onscroll={recomputeWindow}
          style={`max-height:${VIEWPORT_HEIGHT}px; overflow-y:auto;`}
        >
          <Table class="min-w-full">
            <TableHeader>
              <TableRow
                class="border-0 text-xs uppercase tracking-[0.22em] text-muted-foreground"
              >
                <TableHead class="w-[72px] rounded-l-xl"
                  >{t("common.image")}</TableHead
                >
                <TableHead>{t("common.name")}</TableHead>
                <TableHead class="text-right">{t("common.price")}</TableHead>
                <TableHead class="text-center">{t("common.stock")}</TableHead>
                <TableHead class="rounded-r-xl text-right"
                  >{t("common.actions")}</TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              {#if topPad > 0}
                <TableRow
                  ><TableCell
                    colspan={5}
                    style={`height:${topPad}px; padding:0; border:0;`}
                  ></TableCell></TableRow
                >
              {/if}
              {#each filtered().slice(startIndex, endIndex) as product}
                <TableRow class="border-b border-outline-soft/40 text-sm">
                  <TableCell>
                    {#if product.image_url}
                      <img
                        src={product.image_url}
                        alt={product.name}
                        class="size-10 rounded-lg object-cover"
                        loading="lazy"
                      />
                    {:else}
                      <div
                        class="grid size-10 place-items-center rounded-lg border border-outline-soft/60 text-xs text-muted-foreground"
                      >
                        —
                      </div>
                    {/if}
                  </TableCell>
                  <TableCell class="max-w-[320px] truncate">
                    <div class="font-medium text-foreground">
                      {product.name}
                    </div>
                    {#if product.stock_quantity !== -1 && product.stock_quantity <= 3}
                      <span class="text-xs text-muted-foreground"
                        >{t("inventory.low")}</span
                      >
                    {/if}
                  </TableCell>
                  <TableCell class="text-right font-medium text-foreground">
                    €{Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell class="text-center text-sm text-muted-foreground">
                    {product.stock_quantity === -1
                      ? "∞"
                      : String(product.stock_quantity)}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="rounded-lg border border-outline-soft/70"
                      onclick={() => openEdit(product)}
                      aria-label={t("common.edit")}
                    >
                      <Pencil class="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              {/each}
              {#if bottomPad > 0}
                <TableRow
                  ><TableCell
                    colspan={5}
                    style={`height:${bottomPad}px; padding:0; border:0;`}
                  ></TableCell></TableRow
                >
              {/if}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  </div>

  <AddProductDialog bind:open={showAdd} {categories} {onCreate} />
  <EditProductDialog
    bind:open={showEdit}
    product={selected}
    {categories}
    {onSave}
    {onUploadImage}
  />
  <ManageCategoriesDialog bind:open={showCategories} bind:categories />
</PageContent>
