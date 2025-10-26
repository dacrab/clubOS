<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";

const Dialog = DialogPrimitive.Root;

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

((..._args: unknown[]) => {
	return;
})(
	Dialog,
	Button,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	Input,
	Label,
	Switch,
	t,
	open,
	categories,
	save,
);
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[520px] rounded-2xl border border-outline-soft/70 bg-surface-soft/95 shadow-xl">
    <DialogHeader class="border-b border-outline-soft/60 pb-4">
      <DialogTitle class="text-lg font-semibold text-foreground">
        {t("pages.products.add")}
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
            <Switch bind:checked={form.unlimited} id="unlimited" />
            <label for="unlimited">{t("common.unlimited")}</label>
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
    </div>
    <DialogFooter class="flex items-center justify-end gap-2 border-t border-outline-soft/60 pt-4">
      <Button type="button" variant="ghost" class="rounded-lg" onclick={() => (open = false)}>
        {t("common.cancel")}
      </Button>
      <Button type="button" class="rounded-lg" onclick={save}>{t("common.add")}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
