<script lang="ts">
  import { Dialog as DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
  import Button from '$lib/components/ui/button/button.svelte';
  let { open = $bindable(false), title = 'User', form = $bindable({ email: '', password: '', username: '', role: 'staff' as 'admin'|'staff'|'secretary' }), onSubmit }: { open?: boolean; title?: string; form?: any; onSubmit: () => Promise<void> } = $props();
  function onOpenChange(v: boolean) { open = v; }
</script>

<DialogRoot open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
    <div class="grid gap-2">
      <input class="border p-2 rounded" placeholder="Email" bind:value={form.email} />
      <input class="border p-2 rounded" placeholder="Password" type="password" bind:value={form.password} />
      <input class="border p-2 rounded" placeholder="Username" bind:value={form.username} />
      <select class="border p-2 rounded" bind:value={form.role}>
        <option value="admin">admin</option>
        <option value="staff">staff</option>
        <option value="secretary">secretary</option>
      </select>
    </div>
    <DialogFooter class="mt-3 flex gap-2 justify-end">
      <Button variant="outline" onclick={() => (open = false)}>Close</Button>
      <Button onclick={onSubmit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>


