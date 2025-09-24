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
import { t } from "$lib/i18n";

let { open = $bindable(false), onReset } = $props<{
  open: boolean;
  onReset: (password: string) => Promise<void>;
}>();

let password = $state("");

async function submit() {
  await onReset(password);
  password = "";
  open = false;
}
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[420px]">
    <DialogHeader>
      <DialogTitle>{t('common.password')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-3 py-2">
      <div class="grid gap-1.5">
        <Label for="password">{t('common.password')}</Label>
        <Input id="password" type="password" bind:value={password} placeholder={t('pages.users.newPasswordPlaceholder')} />
      </div>
    </div>
    <DialogFooter>
      <Button onclick={submit}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
