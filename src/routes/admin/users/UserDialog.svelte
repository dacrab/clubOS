<script lang="ts">
  import {
    Button,
  } from '$lib/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import { t } from '$lib/i18n';

  let { open = $bindable(), user = null, onSave } = $props<{
    open: boolean;
    user: any | null;
    onSave: (u: any) => Promise<void>;
  }>();

  let form = $state({
    username: '',
    password: '',
    role: 'staff' as 'admin'|'staff'|'secretary',
    active: true,
  });

  $effect(() => {
    if (user) {
      form.username = user.username || '';
      form.role = user.role || 'staff';
      form.active = user.active ?? true;
      form.password = '';
    } else {
      form.username = '';
      form.password = '';
      form.role = 'staff';
      form.active = true;
    }
  });

  async function save() {
    await onSave({ ...user, ...form });
    open = false;
  }
</script>

<Dialog bind:open={open}>
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>{user ? t('pages.users.edit') : t('pages.users.add')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="username" class="text-right">{t('common.username')}</Label>
        <Input id="username" bind:value={form.username} class="col-span-3" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="password" class="text-right">{t('common.password')}</Label>
        <Input id="password" type="password" bind:value={form.password} class="col-span-3" placeholder="Leave blank to keep unchanged" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="role" class="text-right">{t('common.role')}</Label>
        <select id="role" bind:value={form.role} class="col-span-3 border p-2 rounded">
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="secretary">Secretary</option>
        </select>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="active" class="text-right">{t('common.active')}</Label>
        <input id="active" type="checkbox" bind:checked={form.active} />
      </div>
    </div>
    <DialogFooter>
      <Button type="submit" onclick={save}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


