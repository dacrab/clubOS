<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Card } from "$lib/components/ui/card";
	import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { createCrud } from "$lib/state/crud.svelte";
	import { products, categories } from "$lib/services/db";
	import { fmtCurrency } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package, FolderTree, AlertTriangle } from "@lucide/svelte";
	import { type Product, type CategoryPartial, type ProductForm } from "$lib/types/database";

	const { data } = $props();

	let searchQuery = $state("");
	let showCategoryDialog = $state(false);
	let editingCategory = $state<CategoryPartial | null>(null);
	let categoryForm = $state({ name: "", description: "", parent_id: "" });
	let categorySaving = $state(false);


	const crud = createCrud<Product, ProductForm>({
		toForm: (p) => p
			? { name: p.name, description: p.description ?? "", price: p.price, stock_quantity: p.stock_quantity, category_id: p.category_id ?? "", image_url: p.image_url ?? "" }
			: { name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" },
		onCreate: async (f) => products.create({ name: f.name, description: f.description || undefined, price: f.price, stock_quantity: f.stock_quantity, category_id: f.category_id || undefined, image_url: f.image_url || undefined, facility_id: data.user.facilityId ?? "", created_by: data.user.id }),
		onUpdate: async (id, f) => products.update(id, { name: f.name, description: f.description || undefined, price: f.price, stock_quantity: f.stock_quantity, category_id: f.category_id || undefined, image_url: f.image_url || undefined }),
		onDelete: async (id) => products.remove(id),
		getId: (p) => p.id,
		getName: (p) => p.name,
	});

	const filtered = $derived(searchQuery ? data.products.filter((p: Product) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : data.products);
	const lowStockProducts = $derived(data.lowStockProducts ?? []);
	const getCategoryName = (id: string | null): string => id ? (data.categories as CategoryPartial[]).find((c) => c.id === id)?.name ?? "-" : "-";
	const getStockBadge = (stock: number) => {
		const threshold = settings.current.low_stock_threshold;
		return stock <= 0 ? { variant: "destructive" as const, label: t("products.outOfStock") }
			: stock <= threshold ? { variant: "warning" as const, label: t("products.lowStock") }
			: { variant: "success" as const, label: t("products.inStock") };
	};

	function openCategoryDialog(cat?: CategoryPartial) {
		editingCategory = cat ?? null;
		categoryForm = cat ? { name: cat.name, description: cat.description ?? "", parent_id: cat.parent_id ?? "" } : { name: "", description: "", parent_id: "" };
		showCategoryDialog = true;
	}

	async function saveCategory() {
		if (!categoryForm.name) return;
		categorySaving = true;
		const payload = { name: categoryForm.name, description: categoryForm.description || undefined, parent_id: categoryForm.parent_id || undefined, facility_id: data.user.facilityId ?? "" };
		const { error } = editingCategory ? await categories.update(editingCategory.id, payload) : await categories.create(payload);
		categorySaving = false;
		if (!error) { showCategoryDialog = false; await invalidateAll(); }
	}

	async function deleteCategory(cat: CategoryPartial) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", cat.name))) return;
		await categories.remove(cat.id);
		await invalidateAll();
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("products.title")} description={t("products.subtitle")}>
		{#snippet actions()}
			<Button variant="outline" onclick={() => openCategoryDialog()}><FolderTree class="mr-2 h-4 w-4" />{t("products.manageCategories")}</Button>
			<Button onclick={() => crud.openCreate()}><Plus class="mr-2 h-4 w-4" />{t("products.addProduct")}</Button>
		{/snippet}
	</PageHeader>

	{#if lowStockProducts.length > 0}
		<Card class="border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
			<div class="flex items-center gap-3">
				<div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
					<AlertTriangle class="h-5 w-5 text-amber-600" />
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
				{#snippet actions()}<Button onclick={() => crud.openCreate()}><Plus class="mr-2 h-4 w-4" />{t("products.addProduct")}</Button>{/snippet}
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
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => crud.openEdit(product)} aria-label={t("common.edit")}><Pencil class="h-4 w-4" /></Button>
									<Button variant="ghost" size="icon-sm" onclick={() => crud.remove(product)} aria-label={t("common.delete")}><Trash2 class="h-4 w-4" /></Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<FormDialog bind:open={crud.open} title={crud.isEdit ? t("products.editProduct") : t("products.addProduct")} description={t("products.subtitle")} saving={crud.saving} onsubmit={() => crud.save()} onclose={() => crud.close()}>
	<div class="space-y-2"><Label for="name">{t("products.productName")}</Label><Input id="name" bind:value={crud.form.name} required /></div>
	<div class="space-y-2"><Label for="desc">{t("common.description")}</Label><Input id="desc" bind:value={crud.form.description} /></div>
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2"><Label for="price">{t("common.price")}</Label><Input id="price" type="number" step="0.01" min="0" bind:value={crud.form.price} required /></div>
		<div class="space-y-2"><Label for="stock">{t("common.stock")}</Label><Input id="stock" type="number" bind:value={crud.form.stock_quantity} /></div>
	</div>
	<div class="space-y-2">
		<Label>{t("products.category")}</Label>
		<Select bind:value={crud.form.category_id}>
			<SelectTrigger selected={getCategoryName(crud.form.category_id) || t("products.noCategory")} placeholder={t("products.selectCategory")} />
			<SelectContent>
				<SelectItem value="">{t("products.noCategory")}</SelectItem>
				{#each data.categories as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
			</SelectContent>
		</Select>
	</div>
	<div class="space-y-2"><Label for="img">{t("products.imageUrl")}</Label><Input id="img" bind:value={crud.form.image_url} /></div>
</FormDialog>

<FormDialog bind:open={showCategoryDialog} title={editingCategory ? t("categories.editCategory") : t("categories.addCategory")} saving={categorySaving} onsubmit={saveCategory} onclose={() => showCategoryDialog = false}>
	{#if data.categories.length > 0 && !editingCategory}
		<div class="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
			{#each data.categories as cat (cat.id)}
				<div class="flex items-center justify-between rounded-lg border p-2 hover:bg-accent">
					<span class="font-medium">{cat.name}</span>
					<div class="flex items-center gap-1">
						<Button variant="ghost" size="icon-sm" onclick={() => openCategoryDialog(cat)} aria-label={t("common.edit")}><Pencil class="h-4 w-4" /></Button>
						<Button variant="ghost" size="icon-sm" onclick={() => deleteCategory(cat)} aria-label={t("common.delete")}><Trash2 class="h-4 w-4" /></Button>
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
			<SelectTrigger selected={(data.categories as CategoryPartial[]).find((c) => c.id === categoryForm.parent_id)?.name ?? t("categories.noParent")} placeholder={t("categories.noParent")} />
			<SelectContent>
				<SelectItem value="">{t("categories.noParent")}</SelectItem>
				{#each (data.categories as CategoryPartial[]).filter((c) => c.id !== editingCategory?.id) as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
			</SelectContent>
		</Select>
	</div>
</FormDialog>
