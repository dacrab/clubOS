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
  import { t } from '$lib/i18n';

  let { open = $bindable(false), product = null as any, categories = [] as Array<{ id: string; name: string }>, onSave, onUploadImage } = $props<{
    open: boolean;
    product: any | null;
    categories: Array<{ id: string; name: string }>;
    onSave: (payload: { id: string; name: string; price: number; stock_quantity: number; category_id: string | null }) => Promise<void>;
    onUploadImage: (file: File, productId: string) => Promise<void>;
  }>();

  let form = $state({ id: '', name: '', price: 0, stock_quantity: 0, category_id: '', image_url: '' });

  $effect(() => {
    if (product) {
      form = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock_quantity: Number(product.stock_quantity),
        category_id: product.category_id || '',
        image_url: product.image_url || ''
      };
    }
  });

  async function save() {
    await onSave({
      id: form.id,
      name: form.name,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
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
        <Label for="stock" class="text-right">{t('common.stock')}</Label>
        <Input id="stock" type="number" bind:value={form.stock_quantity} class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="cat" class="text-right">{t('common.category')}</Label>
        <select id="cat" bind:value={form.category_id} class="col-span-3 border p-2 rounded">
          <option value="">—</option>
          {#each categories as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
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
