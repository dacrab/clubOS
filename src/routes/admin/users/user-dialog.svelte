<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";

const Dialog = DialogPrimitive.Root;

import { Select as SelectPrimitive } from "bits-ui";
import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
import { t } from "$lib/i18n";

type AdminUser = {
	id?: string;
	username?: string;
	role?: "admin" | "staff" | "secretary" | string;
	email?: string;
	active?: boolean;
	password?: string;
};

let {
	open = $bindable(),
	user = null as AdminUser | null,
	onSave,
} = $props<{
	open: boolean;
	user: AdminUser | null;
	onSave: (u: AdminUser) => Promise<void>;
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
const Select = SelectPrimitive.Root;
((..._args: unknown[]) => {
	return;
})(
	Dialog,
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
	Button,
	t,
	save,
	open,
	user,
);
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[520px] rounded-2xl border border-outline-soft/70 bg-surface-soft/95 shadow-xl">
    <DialogHeader class="border-b border-outline-soft/60 pb-4">
      <DialogTitle class="text-lg font-semibold text-foreground">
        {user ? t("pages.users.edit") : t("pages.users.add")}
      </DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="grid gap-1.5">
          <Label for="username" class="text-sm text-muted-foreground">
            {t("common.username")}
          </Label>
          <Input
            id="username"
            bind:value={form.username}
            placeholder={t("pages.users.usernamePlaceholder")}
            class="rounded-lg border-outline-soft bg-background"
          />
        </div>
        <div class="grid gap-1.5">
          <Label for="password" class="text-sm text-muted-foreground">
            {t("common.password")}
          </Label>
          <Input
            id="password"
            type="password"
            bind:value={form.password}
            placeholder={t("pages.users.passwordOptionalPlaceholder")}
            class="rounded-lg border-outline-soft bg-background"
          />
        </div>
        <div class="grid gap-1.5 sm:col-span-2">
          <Label class="text-sm text-muted-foreground">{t("common.role")}</Label>
          <Select bind:value={form.role} type="single">
            <SelectTrigger class="w-full rounded-lg border-outline-soft bg-background">
              <span data-slot="select-value" class="truncate capitalize text-sm">
                {form.role}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin" label={t("nav.admin")} />
              <SelectItem value="staff" label={t("dashboard.staff.title")} />
              <SelectItem value="secretary" label={t("dashboard.secretary.title")} />
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    <DialogFooter class="border-t border-outline-soft/60 pt-4">
      <Button type="submit" class="rounded-lg" onclick={save}>
        {t("common.save")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


