<script lang="ts">
import { AlertTriangle, FolderTree, Package, Pencil, Plus, Trash2 } from "@lucide/svelte";
import ImageUpload from "$lib/components/image-upload.svelte";
import EmptyState from "$lib/components/layout/empty-state.svelte";
import PageHeader from "$lib/components/layout/page-header.svelte";
import Badge from "$lib/components/ui/badge/badge.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import ConfirmDelete from "$lib/components/ui/confirm-delete/confirm-delete.svelte";
import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import Pagination from "$lib/components/ui/pagination/pagination.svelte";
import Select from "$lib/components/ui/select/select.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
import Table, {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table/table.svelte";
import { t } from "$lib/i18n/index.svelte";
import { settings } from "$lib/state/settings.svelte";
import type { CategoryPartial, Product, ProductForm } from "$lib/types/database";
import { runCrud } from "$lib/utils/crud";
import { fmtCurrency } from "$lib/utils/format";
import { supabase } from "$lib/utils/supabase";

const { data } = $props();

const blankProduct = (): ProductForm => ({
	name: "",
	description: "",
	price: 0,
	stock_quantity: 0,
	category_id: "",
	image_url: "",
});
const blankCategory = (): { name: string; description: string; parent_id: string } => ({
	name: "",
	description: "",
	parent_id: "",
});

let searchQuery = $state("");

let productOpen = $state(false);
let editingProduct = $state<Product | null>(null);
let productForm = $state<ProductForm>(blankProduct());
let savingProduct = $state(false);

let categoryOpen = $state(false);
let editingCategory = $state<CategoryPartial | null>(null);
let categoryForm = $state(blankCategory());
let savingCategory = $state(false);

let deleteTarget = $state<Product | null>(null);
let deleteOpen = $state(false);
let deleteCatTarget = $state<CategoryPartial | null>(null);
let deleteCatOpen = $state(false);

const filtered = $derived(
	searchQuery
		? data.paginatedProducts.filter((p: Product) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: data.paginatedProducts,
);
const getCategoryName = (id: string | null): string =>
	id ? (data.categories.find((c: CategoryPartial) => c.id === id)?.name ?? "-") : "-";
const getStockBadge = (
	stock: number,
): { variant: "destructive" | "warning" | "success"; label: string } => {
	const threshold = settings.current.low_stock_threshold;
	return stock <= 0
		? { variant: "destructive", label: t("products.outOfStock") }
		: stock <= threshold
			? { variant: "warning", label: t("products.lowStock") }
			: { variant: "success", label: t("products.inStock") };
};

function openProductCreate(): void {
	editingProduct = null;
	productForm = blankProduct();
	productOpen = true;
}
function openProductEdit(p: Product): void {
	editingProduct = p;
	productForm = {
		name: p.name,
		description: p.description ?? "",
		price: p.price,
		stock_quantity: p.stock_quantity,
		category_id: p.category_id ?? "",
		image_url: p.image_url ?? "",
	};
	productOpen = true;
}
function openCategoryCreate(): void {
	editingCategory = null;
	categoryForm = blankCategory();
	categoryOpen = true;
}
function openCategoryEdit(cat: CategoryPartial): void {
	editingCategory = cat;
	categoryForm = {
		name: cat.name,
		description: cat.description ?? "",
		parent_id: cat.parent_id ?? "",
	};
	categoryOpen = true;
}

async function saveProduct(): Promise<void> {
	if (!data.user.facilityId || !data.user.id) return;
	savingProduct = true;
	const payload = {
		name: productForm.name,
		description: productForm.description || null,
		price: productForm.price,
		stock_quantity: productForm.stock_quantity,
		category_id: productForm.category_id || null,
		image_url: productForm.image_url || null,
		...(!editingProduct && { facility_id: data.user.facilityId, created_by: data.user.id }),
	};
	const ok = await runCrud(() =>
		editingProduct
			? supabase.from("products").update(payload).eq("id", editingProduct.id)
			: supabase.from("products").insert(payload),
	);
	if (ok) productOpen = false;
	savingProduct = false;
}

async function saveCategory(): Promise<void> {
	if (!data.user.facilityId) return;
	savingCategory = true;
	const payload = {
		name: categoryForm.name,
		description: categoryForm.description || null,
		parent_id: categoryForm.parent_id || null,
		...(!editingCategory && { facility_id: data.user.facilityId }),
	};
	const ok = await runCrud(() =>
		editingCategory
			? supabase.from("categories").update(payload).eq("id", editingCategory.id)
			: supabase.from("categories").insert(payload),
	);
	if (ok) categoryOpen = false;
	savingCategory = false;
}

async function confirmDeleteProduct(): Promise<void> {
	if (!deleteTarget) return;
	const target = deleteTarget;
	const ok = await runCrud(() => supabase.from("products").delete().eq("id", target.id));
	if (ok) deleteOpen = false;
}
async function confirmDeleteCategory(): Promise<void> {
	if (!deleteCatTarget) return;
	const target = deleteCatTarget;
	const ok = await runCrud(() => supabase.from("categories").delete().eq("id", target.id));
	if (ok) deleteCatOpen = false;
}
</script>

<div class="space-y-6">
	<PageHeader title={t("products.title")} description={t("products.subtitle")}>
		{#snippet actions()}
			<Button variant="outline" onclick={openCategoryCreate}><FolderTree class="mr-2 icon-sm" />{t("products.manageCategories")}</Button>
			<Button onclick={openProductCreate}><Plus class="mr-2 icon-sm" />{t("products.addProduct")}</Button>
		{/snippet}
	</PageHeader>

	{#if data.lowStockProducts.length > 0}
		<Card class="border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
			<div class="flex-center gap-3">
				<div class="flex-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
					<AlertTriangle class="icon-md text-amber-600" />
				</div>
				<div class="flex-1">
					<p class="font-semibold text-amber-800 dark:text-amber-200">{t("products.lowStockAlert")}</p>
					<p class="text-sm text-amber-700 dark:text-amber-300">{data.lowStockProducts.map((p: Product) => `${p.name} (${p.stock_quantity})`).join(", ")}</p>
				</div>
			</div>
		</Card>
	{/if}

	<Input placeholder={t("common.search")} bind:value={searchQuery} class="max-w-sm" />

	{#if filtered.length === 0}
		<Card class="p-6">
			<EmptyState title={t("products.empty.title")} description={t("products.empty.description")} icon={Package}>
				{#snippet actions()}<Button onclick={openProductCreate}><Plus class="mr-2 icon-sm" />{t("products.addProduct")}</Button>{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card>
			<Table>
				<TableHeader><TableRow>
					<TableHead>{t("common.name")}</TableHead>
					<TableHead>{t("products.category")}</TableHead>
					<TableHead>{t("common.price")}</TableHead>
					<TableHead>{t("common.stock")}</TableHead>
					<TableHead class="w-24">{t("common.actions")}</TableHead>
				</TableRow></TableHeader>
				<TableBody>
					{#each filtered as product (product.id)}
						{@const badge = getStockBadge(product.stock_quantity)}
						<TableRow>
							<TableCell class="font-medium">{product.name}</TableCell>
							<TableCell>{getCategoryName(product.category_id)}</TableCell>
							<TableCell>{fmtCurrency(product.price)}</TableCell>
							<TableCell><Badge variant={badge.variant}>{product.stock_quantity < 0 ? "∞" : product.stock_quantity}</Badge></TableCell>
							<TableCell>
								<div class="flex-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openProductEdit(product)} aria-label={t("common.edit")}><Pencil class="icon-sm" /></Button>
									<Button variant="ghost" size="icon-sm" onclick={() => { deleteTarget = product; deleteOpen = true; }} aria-label={t("common.delete")}><Trash2 class="icon-sm" /></Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
		<Pagination page={data.page} totalPages={data.totalPages} />
	{/if}
</div>

<FormDialog bind:open={productOpen} title={editingProduct ? t("products.editProduct") : t("products.addProduct")} saving={savingProduct} onsubmit={saveProduct} onclose={() => productOpen = false}>
	<div class="space-y-2"><Label for="name">{t("products.productName")}</Label><Input id="name" bind:value={productForm.name} required /></div>
	<div class="space-y-2"><Label for="desc">{t("common.description")}</Label><Input id="desc" bind:value={productForm.description} /></div>
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2"><Label for="price">{t("common.price")}</Label><Input id="price" type="number" step="0.01" min="0" bind:value={productForm.price} required /></div>
		<div class="space-y-2"><Label for="stock">{t("common.stock")}</Label><Input id="stock" type="number" bind:value={productForm.stock_quantity} /></div>
	</div>
	<div class="space-y-2">
		<Label>{t("products.category")}</Label>
		<Select bind:value={productForm.category_id}>
			<SelectTrigger selected={getCategoryName(productForm.category_id) || t("products.noCategory")} placeholder={t("products.selectCategory")} />
			<SelectContent>
				<SelectItem value="">{t("products.noCategory")}</SelectItem>
				{#each data.categories as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
			</SelectContent>
		</Select>
	</div>
	<div class="space-y-2"><Label for="img">{t("products.imageUrl")}</Label><ImageUpload bucket="products" currentUrl={productForm.image_url} onUpload={(url) => productForm.image_url = url} /></div>
</FormDialog>

<FormDialog bind:open={categoryOpen} title={editingCategory ? t("categories.editCategory") : t("categories.addCategory")} saving={savingCategory} onsubmit={saveCategory} onclose={() => categoryOpen = false}>
	{#if data.categories.length > 0 && !editingCategory}
		<div class="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
			{#each data.categories as cat (cat.id)}
				<div class="flex-between rounded-lg border p-2 hover:bg-accent">
					<span class="font-medium">{cat.name}</span>
					<div class="flex-center gap-1">
						<Button variant="ghost" size="icon-sm" onclick={() => openCategoryEdit(cat)} aria-label={t("common.edit")}><Pencil class="icon-sm" /></Button>
						<Button variant="ghost" size="icon-sm" onclick={() => { deleteCatTarget = cat; deleteCatOpen = true; }} aria-label={t("common.delete")}><Trash2 class="icon-sm" /></Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	<div class="space-y-2"><Label for="catName">{t("categories.categoryName")}</Label><Input id="catName" bind:value={categoryForm.name} required /></div>
	<div class="space-y-2"><Label for="catDesc">{t("common.description")}</Label><Input id="catDesc" bind:value={categoryForm.description} /></div>
	<div class="space-y-2">
		<Label>{t("categories.parentCategory")}</Label>
		<Select bind:value={categoryForm.parent_id}>
			<SelectTrigger selected={data.categories.find((c) => c.id === categoryForm.parent_id)?.name ?? t("categories.noParent")} placeholder={t("categories.noParent")} />
			<SelectContent>
				<SelectItem value="">{t("categories.noParent")}</SelectItem>
				{#each data.categories.filter((c) => c.id !== editingCategory?.id) as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
			</SelectContent>
		</Select>
	</div>
</FormDialog>

<ConfirmDelete bind:open={deleteOpen} name={deleteTarget?.name ?? ""} onconfirm={confirmDeleteProduct} oncancel={() => deleteOpen = false} />
<ConfirmDelete bind:open={deleteCatOpen} name={deleteCatTarget?.name ?? ""} onconfirm={confirmDeleteCategory} oncancel={() => deleteCatOpen = false} />
