<script lang="ts">
import { Pencil, Shield, Users } from "@lucide/svelte";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { loadCurrentUser } from "$lib/user";
import UserDialog from "./UserDialog.svelte";

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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      const { toast } = await import("svelte-sonner");
      toast.error("Not authenticated");
      return;
    }
    const payload = {
      id: user.id,
      role: user.role,
      username: user.username,
      // send password only if provided
      ...(user.password ? { password: user.password } : {}),
      ...(typeof user.active === "boolean" ? { active: user.active } : {}),
    };
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { toast } = await import("svelte-sonner");
      toast.error(await res.text());
      return;
    }
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

<PageContent>
  <PageHeader title={t("pages.users.title")} icon={Users}>
    <Button type="button" class="rounded-lg" onclick={openNewUserDialog}>
      {t("pages.users.add")}
    </Button>
  </PageHeader>

  <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
    <div class="overflow-x-auto">
      <Table class="min-w-full">
        <TableHeader>
          <TableRow class="border-0 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <TableHead class="rounded-l-xl bg-surface-strong/60">{t("common.username")}</TableHead>
            <TableHead class="bg-surface-strong/60">{t("common.role")}</TableHead>
            <TableHead class="rounded-r-xl bg-surface-strong/60 text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each users as user}
            <TableRow class="border-b border-outline-soft/40 text-sm">
              <TableCell>
                <div class="flex items-center gap-3 text-foreground">
                  <span class="grid size-9 place-items-center rounded-full border border-outline-soft/60 bg-surface-strong text-sm font-semibold uppercase">
                    {user.username?.slice(0, 2) ?? "--"}
                  </span>
                  <div class="flex flex-col text-sm">
                    <span class="font-medium">{user.username}</span>
                    {#if user.email}
                      <span class="text-xs text-muted-foreground">{user.email}</span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell class="capitalize">
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield class="size-4" />
                  {user.role}
                </div>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="rounded-lg border border-outline-soft/70"
                  onclick={() => editUser(user)}
                  aria-label={t("common.edit")}
                >
                  <Pencil class="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>


