<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
  import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
  import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
  import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  const Dialog = DialogPrimitive.Root;
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import * as Select from '$lib/components/ui/select';
  import Switch from '$lib/components/ui/switch/switch.svelte';
  import { t } from '$lib/i18n';

  let { open = $bindable(false), product = null as any, categories = [] as Array<{ id: string; name: string }>, onSave, onUploadImage } = $props<{
    open: boolean;
    product: any | null;
    categories: Array<{ id: string; name: string }>;
    onSave: (payload: { id: string; name: string; price: number; stock_quantity: number; category_id: string | null }) => Promise<void>;
    onUploadImage: (file: File, productId: string) => Promise<void>;
  }>();

  let form = $state({ id: '', name: '', price: 0, stock_quantity: 0, category_id: '', image_url: '', unlimited: false });

  $effect(() => {
    if (product) {
      form = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock_quantity: Number(product.stock_quantity),
        category_id: product.category_id || '',
        image_url: product.image_url || '',
        unlimited: product.stock_quantity === -1
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
    const file = input.files && input.files[0];
    if (!file || !form.id) return;
    await onUploadImage(file, form.id);
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
        <Label class="text-right">Stock</Label>
        <div class="col-span-3 flex items-center gap-3">
          <Input id="stock" type="number" bind:value={form.stock_quantity} class="w-40" disabled={form.unlimited} />
          <div class="flex items-center gap-2 text-sm">
            <Switch bind:checked={form.unlimited} id="unlimited-edit" />
            <label for="unlimited-edit">Unlimited</label>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.category')}</Label>
        <div class="col-span-3">
          <Select.Root bind:value={form.category_id} type="single">
            <Select.Trigger class="w-full" />
            <Select.Content>
              {#each categories as c}
                <Select.Item value={c.id} label={c.name} />
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.image')}</Label>
        <div class="col-span-3 flex items-center gap-2">
          {#if form.image_url}
            <img src={form.image_url} alt={form.name} class="h-10 w-10 object-cover rounded" />
          {/if}
          <input type="file" accept="image/*" onchange={selectImage} />
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button onclick={save}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
