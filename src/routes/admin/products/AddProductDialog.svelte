<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";

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

let {
  open = $bindable(false),
  categories = [] as Array<{ id: string; name: string }>,
  onCreate,
} = $props<{
  open: boolean;
  categories: Array<{ id: string; name: string }>;
  onCreate: (payload: {
    name: string;
    price: number;
    stock_quantity: number;
    category_id: string | null;
  }) => Promise<void>;
}>();

let form = $state({
  name: "",
  price: 0,
  stock_quantity: 0,
  category_id: "",
  unlimited: false,
});

async function save() {
  await onCreate({
    name: form.name,
    price: Number(form.price),
    stock_quantity: Number(form.unlimited ? -1 : form.stock_quantity),
    category_id: form.category_id || null,
  });
  form = {
    name: "",
    price: 0,
    stock_quantity: 0,
    category_id: "",
    unlimited: false,
  };
  open = false;
}
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle>{t('pages.products.add')}</DialogTitle>
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
            <Switch bind:checked={form.unlimited} id="unlimited" />
            <label for="unlimited">Unlimited</label>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">{t('common.category')}</Label>
        <div class="col-span-3">
          <Select bind:value={form.category_id} type="single">
            <SelectTrigger class="w-full" />
            <SelectContent>
              {#each categories as c}
                <SelectItem value={c.id} label={c.name} />
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button onclick={save}>{t('common.add')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
