<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import PageHeader from "$lib/components/layout/page-header.svelte";
	import EmptyState from "$lib/components/layout/empty-state.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import Card from "$lib/components/ui/card/card.svelte";
	import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
	import Select from "$lib/components/ui/select/select.svelte";
	import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
	import SelectContent from "$lib/components/ui/select/select-content.svelte";
	import SelectItem from "$lib/components/ui/select/select-item.svelte";
	import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table/table.svelte";
	import { fmtCurrency } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package, FolderTree, AlertTriangle } from "@lucide/svelte";
	import type { Product, CategoryPartial, ProductForm } from "$lib/types/database";

	const { data } = $props();

	let searchQuery = $state("");
	
	// Product CRUD state
	let productOpen = $state(false);
	let editingProduct = $state<Product | null>(null);
	let productForm = $state<ProductForm>({ name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" });
	let savingProduct = $state(false);

	// Category CRUD state
	let categoryOpen = $state(false);
	let editingCategory = $state<CategoryPartial | null>(null);
	let categoryForm = $state({ name: "", description: "", parent_id: "" });
	let savingCategory = $state(false);

	const filtered = $derived(searchQuery ? data.products.filter((p: Product) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : data.products);
	const lowStockProducts = $derived(data.lowStockProducts);
	const getCategoryName = (id: string | null): string => id ? (data.categories as CategoryPartial[]).find((c) => c.id === id)?.name ?? "-" : "-";
	const getStockBadge = (stock: number) => {
		const threshold = settings.current.low_stock_threshold;
		return stock <= 0 ? { variant: "destructive" as const, label: t("products.outOfStock") }
			: stock <= threshold ? { variant: "warning" as const, label: t("products.lowStock") }
			: { variant: "success" as const, label: t("products.inStock") };
	};

	async function saveProduct() {
		savingProduct = true;
		try {
			const { error } = editingProduct
				? await products.update(editingProduct.id, { name: productForm.name, description: productForm.description || undefined, price: productForm.price, stock_quantity: productForm.stock_quantity, category_id: productForm.category_id || undefined, image_url: productForm.image_url || undefined })
				: await products.create({ name: productForm.name, description: productForm.description || undefined, price: productForm.price, stock_quantity: productForm.stock_quantity, category_id: productForm.category_id || undefined, image_url: productForm.image_url || undefined, facility_id: data.user.facilityId ?? "", created_by: data.user.id });
			if (error) throw error;
			productOpen = false;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch (err) {
			console.error(err);
			toast.error(t("common.error"));
		} finally {
			savingProduct = false;
		}
	}

	async function deleteProduct(product: Product) {
		if (!confirmDelete(product.name, t)) return;
		try {
			const { error } = await products.remove(product.id);
			if (error) throw error;
			await showSuccess(t);
		} catch (err) {
			showError(t, err);
		}
	}

	async function saveCategory() {
		savingCategory = true;
		try {
			const { error} = editingCategory
				? await categories.update(editingCategory.id, { name: categoryForm.name, description: categoryForm.description || undefined, parent_id: categoryForm.parent_id || undefined })
				: await categories.create({ name: categoryForm.name, description: categoryForm.description || undefined, parent_id: categoryForm.parent_id || undefined, facility_id: data.user.facilityId ?? "" });
			if (error) throw error;
			categoryOpen = false;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch (err) {
			console.error(err);
			toast.error(t("common.error"));
		} finally {
			savingCategory = false;
		}
	}

	async function deleteCategory(cat: CategoryPartial) {
		if (!confirmDelete(cat.name, t)) return;
		try {
			const { error } = await categories.remove(cat.id);
			if (error) throw error;
			await showSuccess(t);
		} catch (err) {
			showError(t, err);
		}
	}

</script>

<div class="space-y-6">
	<PageHeader title={t("products.title")} description={t("products.subtitle")}>
		{#snippet actions()}
			<Button variant="outline" onclick={() => { editingCategory = null; categoryForm = { name: "", description: "", parent_id: "" }; categoryOpen = true; }}><FolderTree class="mr-2 icon-sm" />{t("products.manageCategories")}</Button>
			<Button onclick={() => { editingProduct = null; productForm = { name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" }; productOpen = true; }}><Plus class="mr-2 icon-sm" />{t("products.addProduct")}</Button>
		{/snippet}
	</PageHeader>

	{#if lowStockProducts.length > 0}
		<Card class="border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
			<div class="flex-center gap-3">
				<div class="flex-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
					<AlertTriangle class="icon-md text-amber-600" />
				</div>
				<div class="flex-1">
					<p class="font-semibold text-amber-800 dark:text-amber-200">{t("products.lowStockAlert")}</p>
					<p class="text-sm text-amber-700 dark:text-amber-300">{lowStockProducts.map((p: Product) => `${p.name} (${p.stock_quantity})`).join(", ")}</p>
				</div>
			</div>
		</Card>
	{/if}

	<Input placeholder={t("common.search")} bind:value={searchQuery} class="max-w-sm" />

	{#if filtered.length === 0}
		<Card class="p-6">
			<EmptyState title={t("products.empty.title")} description={t("products.empty.description")} icon={Package}>
				{#snippet actions()}<Button onclick={() => { editingProduct = null; productForm = { name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" }; productOpen = true; }}><Plus class="mr-2 icon-sm" />{t("products.addProduct")}</Button>{/snippet}
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
									<Button variant="ghost" size="icon-sm" onclick={() => { editingProduct = product; productForm = { name: product.name, description: product.description ?? "", price: product.price, stock_quantity: product.stock_quantity, category_id: product.category_id ?? "", image_url: product.image_url ?? "" }; productOpen = true; }} aria-label={t("common.edit")}><Pencil class="icon-sm" /></Button>
									<Button variant="ghost" size="icon-sm" onclick={() => deleteProduct(product)} aria-label={t("common.delete")}><Trash2 class="icon-sm" /></Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
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
	<div class="space-y-2"><Label for="img">{t("products.imageUrl")}</Label><Input id="img" bind:value={productForm.image_url} /></div>
</FormDialog>

<FormDialog bind:open={categoryOpen} title={editingCategory ? t("categories.editCategory") : t("categories.addCategory")} saving={savingCategory} onsubmit={saveCategory} onclose={() => categoryOpen = false}>
	{#if data.categories.length > 0 && !editingCategory}
		<div class="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
			{#each data.categories as cat (cat.id)}
				<div class="flex-between rounded-lg border p-2 hover:bg-accent">
					<span class="font-medium">{cat.name}</span>
					<div class="flex-center gap-1">
						<Button variant="ghost" size="icon-sm" onclick={() => { editingCategory = cat; categoryForm = { name: cat.name, description: cat.description ?? "", parent_id: cat.parent_id ?? "" }; categoryOpen = true; }} aria-label={t("common.edit")}><Pencil class="icon-sm" /></Button>
						<Button variant="ghost" size="icon-sm" onclick={() => deleteCategory(cat)} aria-label={t("common.delete")}><Trash2 class="icon-sm" /></Button>
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
