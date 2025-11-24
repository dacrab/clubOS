<script lang="ts">
import { Dialog as DialogPrimitive, Select as SelectPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";

import Table from "$lib/components/ui/table/table.svelte";
import TableBody from "$lib/components/ui/table/table-body.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableHead from "$lib/components/ui/table/table-head.svelte";
import TableHeader from "$lib/components/ui/table/table-header.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";

const Dialog = DialogPrimitive.Root;
const Select = SelectPrimitive.Root;
((..._args: unknown[]) => {
	return;
})(Dialog);

export type Category = {
	id: string;
	name: string;
	description?: string | null;
	parent_id?: string | null;
};

let { open = $bindable(false), categories = $bindable([] as Category[]) } =
	$props<{
		open: boolean;
		categories: Category[];
	}>();

let form = $state({ id: "", name: "", description: "", parent_id: "" });

function edit(cat: Category) {
	form = {
		id: cat.id,
		name: cat.name,
		description: cat.description || "",
		parent_id: cat.parent_id || "",
	};
}

function clear() {
	form = { id: "", name: "", description: "", parent_id: "" };
}

async function save() {
	if (form.id) {
		await supabase
			.from("categories")
			.update({
				name: form.name,
				description: form.description,
				parent_id: form.parent_id || null,
			})
			.eq("id", form.id);
	} else {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return;
		}
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", user.id);
		const tenantId = memberships?.[0]?.tenant_id;
		const facId = await facilityState.resolveSelected();
		await supabase.from("categories").insert({
			name: form.name,
			description: form.description,
			parent_id: form.parent_id || null,
			created_by: user.id,
			tenant_id: tenantId,
			facility_id: facId,
		});
	}
	await reload();
	clear();
}

((..._args: unknown[]) => {
	return;
})(
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	t,
	categories,
	edit,
	save,
);

async function remove(id: string) {
	await supabase.from("categories").delete().eq("id", id);
	await reload();
}

// Mark functions used only in markup
((..._args: unknown[]) => {
	return;
})(remove);

async function reload() {
	const facId = await facilityState.resolveSelected();
	const query = supabase
		.from("categories")
		.select("id,name,description,parent_id");
	const { data } = await (facId ? query.eq("facility_id", facId) : query).order(
		"name",
	);
	categories = (data ?? []) as Category[];
}

$effect(() => {
	if (open) {
		reload();
	}
});
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-[720px]">
    <DialogHeader>
      <DialogTitle>{t("products.manageCategories")}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t("common.name")}</Label>
        <Input class="col-span-3" bind:value={form.name} />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t("common.description")}</Label>
        <Input class="col-span-3" bind:value={form.description} />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t("common.parent")}</Label>
        <div class="col-span-3">
          <Select bind:value={form.parent_id} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate">
                {categories.find((x: Category) => x.id === form.parent_id)
                  ?.name || "—"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" label="—" />
              {#each categories as c}
                <SelectItem value={c.id} label={c.name} />
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="flex gap-2 justify-end">
        <Button variant="ghost" onclick={clear}>{t("common.clear")}</Button>
        <Button onclick={save}
          >{form.id ? t("common.save") : t("common.add")}</Button
        >
      </div>
      <div class="border-t pt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead>{t("common.parent")}</TableHead>
              <TableHead class="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#if categories.length === 0}
              <TableRow>
                <TableCell
                  colspan={4}
                  class="py-12 text-center"
                >
                  <div
                    class="mx-auto flex max-w-xs flex-col items-center gap-3 text-center"
                  >
                    <div
                      class="grid size-12 place-items-center rounded-full bg-muted/30"
                    >
                      <svg
                        class="size-6 text-muted-foreground/60"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <title>{t("categories.title")}</title>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                    <div class="flex flex-col gap-1">
                      <h3 class="text-sm font-semibold text-foreground">
                        {t("categories.empty.title")}
                      </h3>
                      <p class="text-xs text-muted-foreground">
                        {t("categories.empty.description")}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            {:else}
            {#each categories as c}
              <TableRow>
                <TableCell>{c.name}</TableCell>
                <TableCell class="truncate max-w-[260px]"
                  >{c.description}</TableCell
                >
                <TableCell
                  >{categories.find((x: Category) => x.id === c.parent_id)
                    ?.name || "—"}</TableCell
                >
                <TableCell class="text-right space-x-2">
                  <Button size="sm" variant="outline" onclick={() => edit(c)}
                    >{t("common.edit")}</Button
                  >
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => remove(c.id)}>{t("common.delete")}</Button
                  >
                </TableCell>
              </TableRow>
            {/each}
            {/if}
          </TableBody>
        </Table>
      </div>
    </div>
    <DialogFooter />
  </DialogContent>
</Dialog>
