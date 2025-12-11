<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";
	import { Card } from "$lib/components/ui/card";
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "$lib/components/ui/dialog";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { supabase } from "$lib/utils/supabase";
	import { fmtCurrency } from "$lib/utils/format";
	import { settings } from "$lib/state/settings.svelte";
	import { Plus, Pencil, Trash2, Package, FolderTree } from "@lucide/svelte";
	import type { Product, Category } from "$lib/types/database";

	const { data } = $props();

	let showDialog = $state(false);
	let showCategoryDialog = $state(false);
	let editingProduct = $state<Product | null>(null);
	let editingCategory = $state<Category | null>(null);
	let saving = $state(false);
	let searchQuery = $state("");

	let formData = $state({ name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" });
	let categoryFormData = $state({ name: "", description: "", parent_id: "" });

	const filteredProducts = $derived(data.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())));

	const getCategoryLabel = (id: string | null) => id ? data.categories.find(c => c.id === id)?.name ?? t("products.noCategory") : t("products.noCategory");
	const getParentLabel = (id: string | null) => id ? data.categories.find(c => c.id === id)?.name ?? t("categories.noParent") : t("categories.noParent");
	const getStockBadge = (stock: number) => {
		const threshold = settings.current.low_stock_threshold;
		return stock <= 0 ? { variant: "destructive" as const, label: t("products.outOfStock") } : stock <= threshold ? { variant: "warning" as const, label: t("products.lowStock") } : { variant: "success" as const, label: t("products.inStock") };
	};

	function openProductDialog(product?: Product) {
		editingProduct = product ?? null;
		formData = product
			? { name: product.name, description: product.description ?? "", price: product.price, stock_quantity: product.stock_quantity, category_id: product.category_id ?? "", image_url: product.image_url ?? "" }
			: { name: "", description: "", price: 0, stock_quantity: 0, category_id: "", image_url: "" };
		showDialog = true;
	}

	function openCategoryDialog(category?: Category) {
		editingCategory = category ?? null;
		categoryFormData = category
			? { name: category.name, description: category.description ?? "", parent_id: category.parent_id ?? "" }
			: { name: "", description: "", parent_id: "" };
		showCategoryDialog = true;
	}

	async function saveProduct() {
		if (!formData.name || formData.price < 0) return toast.error(t("common.error"));
		saving = true;
		try {
			const payload = {
				name: formData.name, description: formData.description || null, price: formData.price,
				stock_quantity: formData.stock_quantity, category_id: formData.category_id || null,
				image_url: formData.image_url || null, tenant_id: data.user.tenantId, facility_id: data.user.facilityId,
			};
			const { error } = editingProduct
				? await supabase.from("products").update(payload).eq("id", editingProduct.id)
				: await supabase.from("products").insert({ ...payload, created_by: data.user.id });
			if (error) throw error;
			toast.success(t("common.success"));
			showDialog = false;
			await invalidateAll();
		} catch { toast.error(t("common.error")); }
		finally { saving = false; }
	}

	async function deleteProduct(product: Product) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", product.name))) return;
		try {
			const { error } = await supabase.from("products").delete().eq("id", product.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch { toast.error(t("common.error")); }
	}

	async function saveCategory() {
		if (!categoryFormData.name) return toast.error(t("common.error"));
		saving = true;
		try {
			const payload = {
				name: categoryFormData.name, description: categoryFormData.description || null,
				parent_id: categoryFormData.parent_id || null, tenant_id: data.user.tenantId, facility_id: data.user.facilityId,
			};
			const { error } = editingCategory
				? await supabase.from("categories").update(payload).eq("id", editingCategory.id)
				: await supabase.from("categories").insert({ ...payload, created_by: data.user.id });
			if (error) throw error;
			toast.success(t("common.success"));
			showCategoryDialog = false;
			await invalidateAll();
		} catch { toast.error(t("common.error")); }
		finally { saving = false; }
	}

	async function deleteCategory(category: Category) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", category.name))) return;
		try {
			const { error } = await supabase.from("categories").delete().eq("id", category.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch { toast.error(t("common.error")); }
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("products.title")} description={t("products.subtitle")}>
		{#snippet actions()}
			<Button variant="outline" onclick={() => openCategoryDialog()}><FolderTree class="mr-2 h-4 w-4" />{t("products.manageCategories")}</Button>
			<Button onclick={() => openProductDialog()}><Plus class="mr-2 h-4 w-4" />{t("products.addProduct")}</Button>
		{/snippet}
	</PageHeader>

	<Input placeholder={t("common.search")} bind:value={searchQuery} class="max-w-sm" />

	{#if filteredProducts.length === 0}
		<Card class="p-6">
			<EmptyState title={t("products.empty.title")} description={t("products.empty.description")} icon={Package}>
				{#snippet actions()}<Button onclick={() => openProductDialog()}><Plus class="mr-2 h-4 w-4" />{t("products.addProduct")}</Button>{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("common.name")}</TableHead>
						<TableHead>{t("products.category")}</TableHead>
						<TableHead>{t("common.price")}</TableHead>
						<TableHead>{t("common.stock")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredProducts as product (product.id)}
						{@const badge = getStockBadge(product.stock_quantity)}
						<TableRow>
							<TableCell class="font-medium">{product.name}</TableCell>
							<TableCell>{data.categories.find(c => c.id === product.category_id)?.name ?? "-"}</TableCell>
							<TableCell>{fmtCurrency(product.price)}</TableCell>
							<TableCell><Badge variant={badge.variant}>{product.stock_quantity < 0 ? "∞" : product.stock_quantity}</Badge></TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openProductDialog(product)}><Pencil class="h-4 w-4" /></Button>
									<Button variant="ghost" size="icon-sm" onclick={() => deleteProduct(product)}><Trash2 class="h-4 w-4" /></Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<!-- Product Dialog -->
<Dialog bind:open={showDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{editingProduct ? t("products.editProduct") : t("products.addProduct")}</DialogTitle>
			<DialogDescription>{t("products.subtitle")}</DialogDescription>
		</DialogHeader>
		<form onsubmit={(e) => { e.preventDefault(); saveProduct(); }} class="space-y-4">
			<div class="space-y-2"><Label for="name">{t("products.productName")}</Label><Input id="name" bind:value={formData.name} required /></div>
			<div class="space-y-2"><Label for="desc">{t("common.description")}</Label><Input id="desc" bind:value={formData.description} /></div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="price">{t("common.price")}</Label><Input id="price" type="number" step="0.01" min="0" bind:value={formData.price} required /></div>
				<div class="space-y-2"><Label for="stock">{t("common.stock")}</Label><Input id="stock" type="number" bind:value={formData.stock_quantity} /></div>
			</div>
			<div class="space-y-2">
				<Label>{t("products.category")}</Label>
				<Select bind:value={formData.category_id}>
					<SelectTrigger selected={getCategoryLabel(formData.category_id)} placeholder={t("products.selectCategory")} />
					<SelectContent>
						<SelectItem value="">{t("products.noCategory")}</SelectItem>
						{#each data.categories as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
					</SelectContent>
				</Select>
			</div>
			<div class="space-y-2"><Label for="img">{t("products.imageUrl")}</Label><Input id="img" bind:value={formData.image_url} /></div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => showDialog = false}>{t("common.cancel")}</Button>
				<Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Category Dialog -->
<Dialog bind:open={showCategoryDialog}>
	<DialogContent>
		<DialogHeader><DialogTitle>{editingCategory ? t("categories.editCategory") : t("categories.addCategory")}</DialogTitle></DialogHeader>
		{#if data.categories.length > 0 && !editingCategory}
			<div class="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
				{#each data.categories as cat (cat.id)}
					<div class="flex items-center justify-between rounded-lg border p-2 hover:bg-accent">
						<span class="font-medium">{cat.name}</span>
						<div class="flex items-center gap-1">
							<Button variant="ghost" size="icon-sm" onclick={() => openCategoryDialog(cat)}><Pencil class="h-4 w-4" /></Button>
							<Button variant="ghost" size="icon-sm" onclick={() => deleteCategory(cat)}><Trash2 class="h-4 w-4" /></Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		<form onsubmit={(e) => { e.preventDefault(); saveCategory(); }} class="space-y-4">
			<div class="space-y-2"><Label for="catName">{t("categories.categoryName")}</Label><Input id="catName" bind:value={categoryFormData.name} required /></div>
			<div class="space-y-2"><Label for="catDesc">{t("common.description")}</Label><Input id="catDesc" bind:value={categoryFormData.description} /></div>
			<div class="space-y-2">
				<Label>{t("categories.parentCategory")}</Label>
				<Select bind:value={categoryFormData.parent_id}>
					<SelectTrigger selected={getParentLabel(categoryFormData.parent_id)} placeholder={t("categories.noParent")} />
					<SelectContent>
						<SelectItem value="">{t("categories.noParent")}</SelectItem>
						{#each data.categories.filter(c => c.id !== editingCategory?.id) as cat (cat.id)}<SelectItem value={cat.id}>{cat.name}</SelectItem>{/each}
					</SelectContent>
				</Select>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => showCategoryDialog = false}>{t("common.cancel")}</Button>
				<Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
