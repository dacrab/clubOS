<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";

const Dialog = DialogPrimitive.Root;

import { ImagePlus } from "@lucide/svelte";
import { Select as SelectPrimitive } from "bits-ui";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";

const Select = SelectPrimitive.Root;

import Switch from "$lib/components/ui/switch/switch.svelte";
import { t } from "$lib/i18n";

let {
	open = $bindable(false),
	product = null as unknown,
	categories = [] as Array<{ id: string; name: string }>,
	onSave,
	onUploadImage,
} = $props<{
	open: boolean;
	product: unknown | null;
	categories: Array<{ id: string; name: string }>;
	onSave: (payload: {
		id: string;
		name: string;
		price: number;
		stock_quantity: number;
		category_id: string | null;
	}) => Promise<void>;
	onUploadImage: (file: File, productId: string) => Promise<void>;
}>();

let form = $state({
	id: "",
	name: "",
	price: 0,
	stock_quantity: 0,
	category_id: "",
	image_url: "",
	unlimited: false,
});

$effect(() => {
	if (product) {
		form = {
			id: product.id,
			name: product.name,
			price: Number(product.price),
			stock_quantity: Number(product.stock_quantity),
			category_id: product.category_id || "",
			image_url: product.image_url || "",
			unlimited: product.stock_quantity === -1,
		};
	}
});

async function save() {
	await onSave({
		id: form.id,
		name: form.name,
		price: Number(form.price),
		stock_quantity: Number(form.unlimited ? -1 : form.stock_quantity),
		category_id: form.category_id || null,
	});
	open = false;
}

async function selectImage(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!(file && form.id)) {
		return;
	}
	await onUploadImage(file, form.id);
}

let fileInput: HTMLInputElement | null = $state(null);
function triggerFile() {
	fileInput?.click();
}

((..._args: unknown[]) => {
	return;
})(
	Dialog,
	Button,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	Switch,
	ImagePlus,
	t,
	open,
	categories,
	save,
	selectImage,
	triggerFile,
);
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[540px] rounded-2xl border border-outline-soft/70 bg-surface-soft/95 shadow-xl">
    <DialogHeader class="border-b border-outline-soft/60 pb-4">
      <DialogTitle class="text-lg font-semibold text-foreground">
        {t("common.edit")}
      </DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label for="name" class="text-right text-sm text-muted-foreground">
          {t("common.name")}
        </Label>
        <Input id="name" bind:value={form.name} class="col-span-3 rounded-lg border-outline-soft bg-background" />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label for="price" class="text-right text-sm text-muted-foreground">
          {t("common.price")}
        </Label>
        <Input id="price" type="number" step="0.01" bind:value={form.price} class="col-span-3 rounded-lg border-outline-soft bg-background" />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right text-sm text-muted-foreground">
          {t("common.stock")}
        </Label>
        <div class="col-span-3 flex items-center gap-3">
          <Input
            id="stock"
            type="number"
            bind:value={form.stock_quantity}
            class="w-40 rounded-lg border-outline-soft bg-background"
            disabled={form.unlimited}
          />
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch bind:checked={form.unlimited} id="unlimited-edit" />
            <label for="unlimited-edit">{t("common.unlimited")}</label>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right text-sm text-muted-foreground">
          {t("common.category")}
        </Label>
        <div class="col-span-3">
          <Select bind:value={form.category_id} type="single">
            <SelectTrigger class="w-full rounded-lg border-outline-soft bg-background">
              <span data-slot="select-value" class="truncate text-sm">
                {#if form.category_id}
                  {(categories.find((c: { id: string; name: string }) => c.id === form.category_id)?.name) || ""}
                {:else}
                  {t("pages.products.selectCategory")}
                {/if}
              </span>
            </SelectTrigger>
            <SelectContent>
              {#each categories as c}
                <SelectItem value={c.id} label={c.name} />
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right text-sm text-muted-foreground">
          {t("common.image")}
        </Label>
        <div class="col-span-3 flex items-center gap-3">
          {#if form.image_url}
            <button
              type="button"
              class="relative overflow-hidden rounded-lg border border-outline-soft/60"
              onclick={triggerFile}
              aria-label={t("common.changeImage")}
            >
              <img src={form.image_url} alt={form.name} class="size-12 object-cover" />
              <span class="absolute inset-0 bg-black/20 opacity-0 transition-opacity hover:opacity-100"></span>
            </button>
          {/if}
          <input class="hidden" type="file" accept="image/*" onchange={selectImage} bind:this={fileInput} />
          <Button type="button" variant="outline" size="sm" class="rounded-lg" onclick={triggerFile}>
            <ImagePlus class="mr-2 h-4 w-4" />
            {form.image_url ? t("common.changeImage") : t("common.uploadImage")}
          </Button>
        </div>
      </div>
    </div>
    <DialogFooter class="flex items-center justify-end gap-2 border-t border-outline-soft/60 pt-4">
      <Button type="button" variant="ghost" class="rounded-lg" onclick={() => (open = false)}>
        {t("common.cancel")}
      </Button>
      <Button type="button" class="rounded-lg" onclick={save}>
        {t("common.save")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
