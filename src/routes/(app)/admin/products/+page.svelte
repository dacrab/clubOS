<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";
	import { Card, CardContent } from "$lib/components/ui/card";
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
	} from "$lib/components/ui/dialog";
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
	} from "$lib/components/ui/select";
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell,
	} from "$lib/components/ui/table";
	import { supabase } from "$lib/utils/supabase";
	import { fmtCurrency } from "$lib/utils/format";
	import { Plus, Pencil, Trash2, Package, FolderTree } from "@lucide/svelte";
	import type { Product, Category } from "$lib/types/database";

	const { data } = $props();

	let showDialog = $state(false);
	let showCategoryDialog = $state(false);
	let editingProduct = $state<Product | null>(null);
	let editingCategory = $state<Category | null>(null);
	let formData = $state({
		name: "",
		description: "",
		price: 0,
		stock_quantity: 0,
		category_id: "",
		image_url: "",
	});
	let categoryFormData = $state({
		name: "",
		description: "",
		parent_id: "",
	});
	let saving = $state(false);
	let searchQuery = $state("");

	function getCategoryLabel(categoryId: string | null) {
		if (!categoryId) return t("products.noCategory");
		const category = data.categories.find(c => c.id === categoryId);
		return category ? category.name : t("products.noCategory");
	}

	function getParentCategoryLabel(categoryId: string | null) {
		if (!categoryId) return t("categories.noParent");
		const category = data.categories.find(c => c.id === categoryId);
		return category ? category.name : t("categories.noParent");
	}

	let filteredProducts = $derived(
		data.products.filter((p) =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function openNewDialog() {
		editingProduct = null;
		formData = {
			name: "",
			description: "",
			price: 0,
			stock_quantity: 0,
			category_id: "",
			image_url: "",
		};
		showDialog = true;
	}

	function openEditDialog(product: Product) {
		editingProduct = product;
		formData = {
			name: product.name,
			description: product.description ?? "",
			price: product.price,
			stock_quantity: product.stock_quantity,
			category_id: product.category_id ?? "",
			image_url: product.image_url ?? "",
		};
		showDialog = true;
	}

	async function handleSave() {
		if (!formData.name || formData.price < 0) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			const payload = {
				name: formData.name,
				description: formData.description || null,
				price: formData.price,
				stock_quantity: formData.stock_quantity,
				category_id: formData.category_id || null,
				image_url: formData.image_url || null,
				tenant_id: data.user.tenantId,
				facility_id: data.user.facilityId,
			};

			if (editingProduct) {
				const { error } = await supabase
					.from("products")
					.update(payload)
					.eq("id", editingProduct.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("products")
					.insert({ ...payload, created_by: data.user.id });
				if (error) throw error;
			}

			toast.success(t("common.success"));
			showDialog = false;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}

	async function handleDelete(product: Product) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", product.name))) return;

		try {
			const { error } = await supabase.from("products").delete().eq("id", product.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}

	function getStockBadge(stock: number) {
		if (stock <= 0) return { variant: "destructive" as const, label: t("products.outOfStock") };
		if (stock <= 3) return { variant: "warning" as const, label: t("products.lowStock") };
		return { variant: "success" as const, label: t("products.inStock") };
	}

	// Category management
	function openNewCategoryDialog() {
		editingCategory = null;
		categoryFormData = { name: "", description: "", parent_id: "" };
		showCategoryDialog = true;
	}

	function openEditCategoryDialog(category: Category) {
		editingCategory = category;
		categoryFormData = {
			name: category.name,
			description: category.description ?? "",
			parent_id: category.parent_id ?? "",
		};
		showCategoryDialog = true;
	}

	async function handleSaveCategory() {
		if (!categoryFormData.name) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			const payload = {
				name: categoryFormData.name,
				description: categoryFormData.description || null,
				parent_id: categoryFormData.parent_id || null,
				tenant_id: data.user.tenantId,
				facility_id: data.user.facilityId,
			};

			if (editingCategory) {
				const { error } = await supabase
					.from("categories")
					.update(payload)
					.eq("id", editingCategory.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("categories")
					.insert({ ...payload, created_by: data.user.id });
				if (error) throw error;
			}

			toast.success(t("common.success"));
			showCategoryDialog = false;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}

	async function handleDeleteCategory(category: Category) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", category.name))) return;

		try {
			const { error } = await supabase.from("categories").delete().eq("id", category.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("products.title")} description={t("products.subtitle")}>
		{#snippet actions()}
			<Button variant="outline" onclick={openNewCategoryDialog}>
				<FolderTree class="mr-2 h-4 w-4" />
				{t("products.manageCategories")}
			</Button>
			<Button onclick={openNewDialog}>
				<Plus class="mr-2 h-4 w-4" />
				{t("products.addProduct")}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Search -->
	<div class="flex items-center gap-4">
		<Input
			placeholder={t("common.search")}
			bind:value={searchQuery}
			class="max-w-sm"
		/>
	</div>

	<!-- Products Table -->
	{#if filteredProducts.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t("products.empty.title")}
					description={t("products.empty.description")}
					icon={Package}
				>
					{#snippet actions()}
						<Button onclick={openNewDialog}>
							<Plus class="mr-2 h-4 w-4" />
							{t("products.addProduct")}
						</Button>
					{/snippet}
				</EmptyState>
			</CardContent>
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
						{@const stockBadge = getStockBadge(product.stock_quantity)}
						<TableRow>
							<TableCell class="font-medium">{product.name}</TableCell>
							<TableCell>
								{data.categories.find((c) => c.id === product.category_id)?.name ?? "-"}
							</TableCell>
							<TableCell>{fmtCurrency(product.price)}</TableCell>
							<TableCell>
								<Badge variant={stockBadge.variant}>
									{product.stock_quantity < 0 ? "∞" : product.stock_quantity}
								</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => openEditDialog(product)}
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => handleDelete(product)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
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
			<DialogTitle>
				{editingProduct ? t("products.editProduct") : t("products.addProduct")}
			</DialogTitle>
			<DialogDescription>
				{t("products.subtitle")}
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="name">{t("products.productName")}</Label>
				<Input id="name" bind:value={formData.name} required />
			</div>

			<div class="space-y-2">
				<Label for="description">{t("common.description")}</Label>
				<Input id="description" bind:value={formData.description} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="price">{t("common.price")}</Label>
					<Input
						id="price"
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.price}
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="stock">{t("common.stock")}</Label>
					<Input
						id="stock"
						type="number"
						bind:value={formData.stock_quantity}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label>{t("products.category")}</Label>
				<Select bind:value={formData.category_id}>
					<SelectTrigger selected={getCategoryLabel(formData.category_id)} placeholder={t("products.selectCategory")} />
					<SelectContent>
						<SelectItem value="">{t("products.noCategory")}</SelectItem>
						{#each data.categories as category (category.id)}
							<SelectItem value={category.id}>{category.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="space-y-2">
				<Label for="image">{t("products.imageUrl")}</Label>
				<Input id="image" bind:value={formData.image_url} />
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showDialog = false)}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? t("common.loading") : t("common.save")}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Category Dialog -->
<Dialog bind:open={showCategoryDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>
				{editingCategory ? t("categories.editCategory") : t("categories.addCategory")}
			</DialogTitle>
		</DialogHeader>

		<!-- Categories list -->
		{#if data.categories.length > 0 && !editingCategory}
			<div class="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
				{#each data.categories as category (category.id)}
					<div class="flex items-center justify-between rounded-lg border p-2 hover:bg-accent">
						<span class="font-medium">{category.name}</span>
						<div class="flex items-center gap-1">
							<Button variant="ghost" size="icon-sm" onclick={() => openEditCategoryDialog(category)}>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="icon-sm" onclick={() => handleDeleteCategory(category)}>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="categoryName">{t("categories.categoryName")}</Label>
				<Input id="categoryName" bind:value={categoryFormData.name} required />
			</div>

			<div class="space-y-2">
				<Label for="categoryDesc">{t("common.description")}</Label>
				<Input id="categoryDesc" bind:value={categoryFormData.description} />
			</div>

			<div class="space-y-2">
				<Label>{t("categories.parentCategory")}</Label>
				<Select bind:value={categoryFormData.parent_id}>
					<SelectTrigger selected={getParentCategoryLabel(categoryFormData.parent_id)} placeholder={t("categories.noParent")} />
					<SelectContent>
						<SelectItem value="">{t("categories.noParent")}</SelectItem>
						{#each data.categories.filter(c => c.id !== editingCategory?.id) as category (category.id)}
							<SelectItem value={category.id}>{category.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showCategoryDialog = false)}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? t("common.loading") : t("common.save")}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
