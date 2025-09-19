<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import Button from '$lib/components/ui/button/button.svelte';
  import Table from '$lib/components/ui/table/table.svelte';
  import TableBody from '$lib/components/ui/table/table-body.svelte';
  import TableCell from '$lib/components/ui/table/table-cell.svelte';
  import TableHead from '$lib/components/ui/table/table-head.svelte';
  import TableHeader from '$lib/components/ui/table/table-header.svelte';
  import TableRow from '$lib/components/ui/table/table-row.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import UserDialog from './UserDialog.svelte';
  import { t } from '$lib/i18n';
  import { loadCurrentUser } from '$lib/user';
  import PageHeader from '$lib/components/common/PageHeader.svelte';

  let users = $state<any[]>([]);
  let showUserDialog = $state(false);
  let selectedUser = $state<any>(null);

  $effect(() => {
    loadCurrentUser();
    loadUsers();
  });

  function openNewUserDialog() {
    selectedUser = null;
    showUserDialog = true;
  }

  function editUser(user: any) {
    selectedUser = user;
    showUserDialog = true;
  }

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*');
    users = data ?? [];
  }

  async function onSaveUser(user: any) {
    if (user.id) {
      // TODO: update via edge functions for role/active/password
    } else {
      const { error } = await supabase.auth.signUp({
        email: `${user.username}@example.com`,
        password: user.password,
        options: { data: { username: user.username, role: user.role } }
      });
      if (error) {
        alert(error.message);
        return;
      }
    }
    await loadUsers();
  }
</script>

<UserDialog bind:open={showUserDialog} user={selectedUser} onSave={onSaveUser} />

<section class="space-y-4">
  <PageHeader title={t('pages.users.title')}>
    <Button onclick={openNewUserDialog}>{t('pages.users.add')}</Button>
  </PageHeader>

  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('common.username')}</TableHead>
          <TableHead>{t('common.role')}</TableHead>
          <TableHead>{t('common.active')}</TableHead>
          <TableHead class="text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each users as user}
          <TableRow>
            <TableCell>{user.username}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>{user.active ? 'Yes' : 'No'}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="sm" onclick={() => editUser(user)}>{t('common.edit')}</Button>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </Card>
</section>


