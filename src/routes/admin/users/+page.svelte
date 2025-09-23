<script lang="ts">
import PageHeader from "$lib/components/common/PageHeader.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { loadCurrentUser } from "$lib/user";
import UserDialog from "./UserDialog.svelte";
import { Pencil, Shield, User as UserIcon } from "@lucide/svelte";

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
  const { data } = await supabase.from("users").select("*");
  users = data ?? [];
}

async function onSaveUser(user: any) {
  if (user.id) {
    // TODO: call edge functions for role/active update
  } else {
    const { error } = await supabase.auth.signUp({
      email: `${user.username}@example.com`,
      password: user.password,
      options: { data: { username: user.username, role: user.role } },
    });
    if (error) {
      const { toast } = await import("svelte-sonner");
      toast.error(error.message);
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
          <TableHead class="text-base">{t('common.username')}</TableHead>
          <TableHead class="text-base">{t('common.role')}</TableHead>
          <TableHead class="text-right text-base">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each users as user}
          <TableRow class="text-sm md:text-base">
            <TableCell>
              <div class="flex items-center gap-2">
                <UserIcon class="w-4 h-4 text-muted-foreground" />
                <span class="truncate max-w-[260px]">{user.username}</span>
              </div>
            </TableCell>
            <TableCell class="capitalize">
              <div class="flex items-center gap-2">
                <Shield class="w-4 h-4 text-muted-foreground" />
                {user.role}
              </div>
            </TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" onclick={() => editUser(user)} aria-label={t('common.edit')}>
                <Pencil class="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </Card>
</section>


