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
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";

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
    await supabase.from("categories").insert({
      name: form.name,
      description: form.description,
      parent_id: form.parent_id || null,
      created_by: user.id,
      tenant_id: tenantId,
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
  save
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
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? "";
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId);
  const tenantId = memberships?.[0]?.tenant_id;
  const { data } = await supabase
    .from("categories")
    .select("id,name,description,parent_id")
    .eq("tenant_id", tenantId)
    .order("name");
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
      <DialogTitle>{t("pages.products.manageCategories")}</DialogTitle>
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
          </TableBody>
        </Table>
      </div>
    </div>
    <DialogFooter />
  </DialogContent>
</Dialog>
