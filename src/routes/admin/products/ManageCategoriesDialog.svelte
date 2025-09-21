<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";

const Dialog = DialogPrimitive.Root;

import Button from "$lib/components/ui/button/button.svelte";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "$lib/components/ui/select";
import Table from "$lib/components/ui/table/table.svelte";
import TableBody from "$lib/components/ui/table/table-body.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableHead from "$lib/components/ui/table/table-head.svelte";
import TableHeader from "$lib/components/ui/table/table-header.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";
import { supabase } from "$lib/supabaseClient";

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
    if (!user) return;
    await supabase.from("categories").insert({
      name: form.name,
      description: form.description,
      parent_id: form.parent_id || null,
      created_by: user.id,
    });
  }
  await reload();
  clear();
}

async function remove(id: string) {
  await supabase.from("categories").delete().eq("id", id);
  await reload();
}

async function reload() {
  const { data } = await supabase
    .from("categories")
    .select("id,name,description,parent_id")
    .order("name");
  categories = (data as any) ?? [];
}

$effect(() => {
  if (open) reload();
});
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[720px]">
    <DialogHeader>
      <DialogTitle>Manage Categories</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">Name</Label>
        <Input class="col-span-3" bind:value={form.name} />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">Description</Label>
        <Input class="col-span-3" bind:value={form.description} />
      </div>
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">Parent</Label>
        <div class="col-span-3">
          <Select bind:value={form.parent_id} type="single">
            <SelectTrigger class="w-full" />
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
        <Button variant="outline" onclick={clear}>Clear</Button>
        <Button onclick={save}>{form.id ? 'Save' : 'Add'}</Button>
      </div>
      <div class="border-t pt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each categories as c}
              <TableRow>
                <TableCell>{c.name}</TableCell>
                <TableCell class="truncate max-w-[260px]">{c.description}</TableCell>
                <TableCell>{(categories.find((x: Category) => x.id === c.parent_id)?.name) || '—'}</TableCell>
                <TableCell class="text-right space-x-2">
                  <Button size="sm" variant="outline" onclick={() => edit(c)}>Edit</Button>
                  <Button size="sm" variant="destructive" onclick={() => remove(c.id)}>Delete</Button>
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


