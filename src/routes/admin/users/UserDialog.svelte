<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import { Button } from "$lib/components/ui/button";

const Dialog = DialogPrimitive.Root;

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "$lib/components/ui/select";
import { t } from "$lib/i18n";

let {
  open = $bindable(),
  user = null,
  onSave,
} = $props<{
  open: boolean;
  user: any | null;
  onSave: (u: any) => Promise<void>;
}>();

const form = $state({
  username: "",
  password: "",
  role: "staff" as "admin" | "staff" | "secretary",
  active: true,
});

$effect(() => {
  if (user) {
    form.username = user.username || "";
    form.role = user.role || "staff";
    form.active = user.active ?? true;
    form.password = "";
  } else {
    form.username = "";
    form.password = "";
    form.role = "staff";
    form.active = true;
  }
});

async function save() {
  await onSave({ ...user, ...form });
  open = false;
}
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[560px]">
    <DialogHeader>
      <DialogTitle>{user ? t('pages.users.edit') : t('pages.users.add')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="grid gap-1.5">
          <Label for="username">{t('common.username')}</Label>
          <Input id="username" bind:value={form.username} placeholder={t('pages.users.usernamePlaceholder')} />
        </div>
        <div class="grid gap-1.5">
          <Label for="password">{t('common.password')}</Label>
          <Input id="password" type="password" bind:value={form.password} placeholder={t('pages.users.passwordOptionalPlaceholder')} />
        </div>
        <div class="grid gap-1.5 sm:col-span-2">
          <Label>{t('common.role')}</Label>
          <Select bind:value={form.role} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate capitalize">{form.role}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin" label="Admin" />
              <SelectItem value="staff" label="Staff" />
              <SelectItem value="secretary" label="Secretary" />
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button type="submit" onclick={save}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


