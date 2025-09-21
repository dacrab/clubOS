<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import Button from "$lib/components/ui/button/button.svelte";

const Dialog = DialogPrimitive.Root;

import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";
import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
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
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="password" class="text-right">{t('common.password')}</Label>
        <Input id="password" type="password" bind:value={password} class="col-span-3" />
      </div>
    </div>
    <DialogFooter>
      <Button onclick={submit}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
