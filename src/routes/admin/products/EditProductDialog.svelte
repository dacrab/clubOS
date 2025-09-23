<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import { Button } from "$lib/components/ui/button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";

const Dialog = DialogPrimitive.Root;

import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "$lib/components/ui/select";
import Switch from "$lib/components/ui/switch/switch.svelte";
import { t } from "$lib/i18n";
import { ImagePlus } from "@lucide/svelte";

let {
  open = $bindable(false),
  product = null as any,
  categories = [] as Array<{ id: string; name: string }>,
  onSave,
  onUploadImage,
} = $props<{
  open: boolean;
  product: any | null;
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
  if (!(file && form.id)) return;
  await onUploadImage(file, form.id);
}

let fileInput: HTMLInputElement | null = $state(null);
function triggerFile() {
  fileInput?.click();
}
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle>{t('common.edit')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="name" class="text-right">{t('common.name')}</Label>
        <Input id="name" bind:value={form.name} class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="price" class="text-right">{t('common.price')}</Label>
        <Input id="price" type="number" step="0.01" bind:value={form.price} class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.stock')}</Label>
        <div class="col-span-3 flex items-center gap-3">
          <Input id="stock" type="number" bind:value={form.stock_quantity} class="w-40" disabled={form.unlimited} />
          <div class="flex items-center gap-2 text-sm">
            <Switch bind:checked={form.unlimited} id="unlimited-edit" />
            <label for="unlimited-edit">{t('common.unlimited')}</label>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.category')}</Label>
        <div class="col-span-3">
          <Select bind:value={form.category_id} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate">
                {#if form.category_id}
                  {(categories.find((c: { id: string; name: string }) => c.id === form.category_id)?.name) || ''}
                {:else}
                  {t('pages.products.selectCategory')}
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
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.image')}</Label>
        <div class="col-span-3 flex items-center gap-3">
          {#if form.image_url}
            <button type="button" class="relative group" onclick={triggerFile} aria-label={t('common.changeImage')}>
              <img src={form.image_url} alt={form.name} class="h-12 w-12 object-cover rounded border" />
              <span class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded"></span>
            </button>
          {/if}
          <input class="hidden" type="file" accept="image/*" onchange={selectImage} bind:this={fileInput} />
          <Button variant="outline" size="sm" onclick={triggerFile}>
            <ImagePlus class="w-4 h-4 mr-1" />
            {form.image_url ? t('common.changeImage') : t('common.uploadImage')}
          </Button>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button onclick={save}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
