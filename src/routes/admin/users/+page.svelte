<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import { supabase } from '$lib/supabaseClient';
  
  type Row = { id: string; username: string; role: 'admin'|'staff'|'secretary'; is_active: boolean; created_at: string };
  let users: Row[] = $state([] as Row[]);
  let targetRole = $state<'admin' | 'staff' | 'secretary'>('staff');
  let targetUserId = $state('');
  let createForm = $state({ email: '', password: '', username: '', role: 'staff' as 'admin'|'staff'|'secretary' });

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'admin') window.location.href = '/dashboard';
      load();
    });
  });

  async function load() {
    const { data } = await supabase.from('users').select('id,username,role,is_active,created_at');
    users = (data as any) ?? [];
  }

  async function setRole() {
    const { error } = await (supabase as any).rpc('admin_set_role', {
      p_user_id: targetUserId,
      p_role: targetRole,
    });
    if (!error) load();
  }

  async function deactivate(userId: string) {
    const { error } = await (supabase as any).rpc('admin_soft_delete_user', { p_user_id: userId });
    if (!error) load();
  }

  async function createUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return (window.location.href = '/login');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      createForm = { email: '', password: '', username: '', role: 'staff' } as any;
      await load();
    }
  }
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Users</h1>
  <div class="grid gap-2 max-w-xl">
    <h2 class="font-semibold">Create user</h2>
    <input class="border p-2 rounded" placeholder="Email" bind:value={createForm.email} />
    <input class="border p-2 rounded" placeholder="Password" type="password" bind:value={createForm.password} />
    <input class="border p-2 rounded" placeholder="Username" bind:value={createForm.username} />
    <select class="border p-2 rounded" bind:value={createForm.role}>
      <option value="admin">admin</option>
      <option value="staff">staff</option>
      <option value="secretary">secretary</option>
    </select>
    <button class="border rounded px-3 py-1" onclick={createUser}>Create</button>
  </div>
  <div class="flex gap-2 items-end">
    <select class="border p-2 rounded" bind:value={targetUserId}>
      <option value="">Select user</option>
      {#each users as u}
        <option value={u.id}>{u.username} ({u.role})</option>
      {/each}
    </select>
    <select class="border p-2 rounded" bind:value={targetRole}>
      <option value="admin">admin</option>
      <option value="staff">staff</option>
      <option value="secretary">secretary</option>
    </select>
    <button class="border rounded px-3 py-1" disabled={!targetUserId} onclick={setRole}>Set role</button>
  </div>

  <h2 class="font-semibold mt-6">All users</h2>
  <table class="text-sm w-full border">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left p-2">Username</th>
        <th class="text-left p-2">Role</th>
        <th class="text-left p-2">Active</th>
        <th class="text-left p-2">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each users as u}
        <tr class="border-t">
          <td class="p-2">{u.username}</td>
          <td class="p-2">{u.role}</td>
          <td class="p-2">{u.is_active ? 'yes' : 'no'}</td>
          <td class="p-2">
            <button class="border rounded px-2 py-1" onclick={() => deactivate(u.id)}>Deactivate</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>


