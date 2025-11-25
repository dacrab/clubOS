<script lang="ts">
import { Pencil, Plus, Shield, Users } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table";
import { facilityState } from "$lib/state/facility.svelte";
import { t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";
import UserDialog from "./user-dialog.svelte";

type AdminUser = {
	id?: string;
	username?: string;
	role?: "admin" | "staff" | "secretary" | string;
	email?: string;
	active?: boolean;
	password?: string;
};
let users = $state<AdminUser[]>([]);
let showUserDialog = $state(false);
let selectedUser = $state<AdminUser | null>(null);

$effect(() => {
	userState.load();
	loadUsers();
});

function openNewUserDialog() {
	selectedUser = null;
	showUserDialog = true;
}

function editUser(user: AdminUser) {
	selectedUser = user;
	showUserDialog = true;
}

async function loadUsers() {
	const { data: sessionData } = await supabase.auth.getUser();
	const uid = sessionData.user?.id;
	if (!uid) {
		users = [];
		return;
	}
	const facilityId = await facilityState.resolveSelected();
	if (!facilityId) {
		users = [];
		return;
	}
	const { data: memberRows } = await supabase
		.from("facility_members")
		.select("user_id")
		.eq("facility_id", facilityId);
	const ids = (memberRows ?? []).map((r: { user_id: string }) => r.user_id);
	if (ids.length === 0) {
		users = [];
		return;
	}
	const { data } = await supabase
		.from("users")
		.select("id, username, role")
		.in("id", ids)
		.order("username");
	users = data ?? [];
}

async function errorToast(message: string) {
	const { toast } = await import("svelte-sonner");
	toast.error(message);
}

function patchUser(payload: AdminUser) {
	return fetch("/api/admin/users", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
}

function postUser(payload: AdminUser) {
	return fetch("/api/admin/users", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
}

function buildPatchPayload(user: AdminUser): AdminUser {
	return {
		...(user.id ? { id: user.id } : {}),
		...(user.role ? { role: user.role } : {}),
		...(user.username ? { username: user.username } : {}),
		...(user.password ? { password: user.password } : {}),
		...(typeof user.active === "boolean" ? { active: user.active } : {}),
	};
}

function buildCreatePayload(user: AdminUser): AdminUser & { email: string } {
	return {
		email: `${user.username ?? ""}@example.com`,
		...(user.password ? { password: user.password } : {}),
		...(user.role ? { role: user.role } : {}),
		...(user.username ? { username: user.username } : {}),
		active: typeof user.active === "boolean" ? user.active : true,
	};
}

async function onSaveUser(user: AdminUser) {
	if (user.id) {
		const payload = buildPatchPayload(user);
		const res = await patchUser(payload);
		if (!res.ok) return errorToast(await res.text());
	} else {
		const createPayload = buildCreatePayload(user);
		const res = await postUser(createPayload);
		if (!res.ok) return errorToast(await res.text());
	}
	await loadUsers();
}
</script>

<UserDialog bind:open={showUserDialog} user={selectedUser} onSave={onSaveUser} />

<PageContent>
  <PageHeader title={t("users.title")}>
    <Button class="gap-2" onclick={openNewUserDialog}>
      <Plus class="size-4" />
      {t("users.add")}
    </Button>
  </PageHeader>

  <Card class="overflow-hidden border-border shadow-sm">
    <Table>
      <TableHeader class="bg-card border-b border-border/60">
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[300px]">{t("common.username")}</TableHead>
          <TableHead>{t("common.role")}</TableHead>
          <TableHead class="text-right w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#if users.length === 0}
          <TableRow>
            <TableCell colspan={3} class="h-96 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Users class="size-8 opacity-50" />
                <p>{t("users.empty.title")}</p>
                <p class="text-xs">{t("users.empty.description")}</p>
                <Button variant="outline" class="mt-2" onclick={openNewUserDialog}>
                  {t("users.add")}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        {:else}
          {#each users as user}
            <TableRow class="h-16">
              <TableCell>
                <div class="flex items-center gap-3">
                  <div class="grid size-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-sm uppercase">
                    {user.username?.slice(0, 2) ?? "--"}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-medium">{user.username}</span>
                    {#if user.email}
                      <span class="text-xs text-muted-foreground">{user.email}</span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Shield class="size-4 text-muted-foreground" />
                  <span class="capitalize">{user.role}</span>
                </div>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onclick={() => editUser(user)}>
                  <Pencil class="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          {/each}
        {/if}
      </TableBody>
    </Table>
  </Card>
</PageContent>
