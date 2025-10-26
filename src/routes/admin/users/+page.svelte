<script lang="ts">
import { Pencil, Shield, Users } from "@lucide/svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import PageContent from "$lib/components/ui/page/page-content.svelte";
import PageHeader from "$lib/components/ui/page/page-header.svelte";
import Table from "$lib/components/ui/table/table.svelte";
import TableBody from "$lib/components/ui/table/table-body.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableHead from "$lib/components/ui/table/table-head.svelte";
import TableHeader from "$lib/components/ui/table/table-header.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";
import { loadCurrentUser } from "$lib/user";
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
	loadCurrentUser();
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
	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id;
	if (!uid) {
		users = [];
		return;
	}
	// Find the admin's primary tenant (first membership)
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.order("tenant_id")
		.limit(1);
	const tenantId = tm?.[0]?.tenant_id as string | undefined;
	if (!tenantId) {
		users = [];
		return;
	}
	// Load user ids that belong to this tenant, then fetch users with IN() to avoid join RLS issues
	const { data: memberRows } = await supabase
		.from("tenant_members")
		.select("user_id")
		.eq("tenant_id", tenantId);
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

async function getAuthToken(): Promise<string | null> {
	const { data: sessionData } = await supabase.auth.getSession();
	return sessionData.session?.access_token ?? null;
}

async function errorToast(message: string) {
	const { toast } = await import("svelte-sonner");
	toast.error(message);
}

function patchUser(payload: AdminUser, token: string) {
	return fetch("/api/admin/users", {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});
}

function postUser(payload: AdminUser, token: string) {
	return fetch("/api/admin/users", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${token}`,
		},
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
	const token = await getAuthToken();
	if (!token) {
		await errorToast("Not authenticated");
		return;
	}

	if (user.id) {
		const payload = buildPatchPayload(user);
		const res = await patchUser(payload, token);
		if (!res.ok) {
			await errorToast(await res.text());
			return;
		}
	} else {
		const createPayload = buildCreatePayload(user);
		const res = await postUser(createPayload, token);
		if (!res.ok) {
			await errorToast(await res.text());
			return;
		}
	}

	await loadUsers();
}
((..._args: unknown[]) => {
	return;
})(
	Pencil,
	Shield,
	Users,
	PageContent,
	PageHeader,
	Button,
	Card,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	t,
	UserDialog,
	openNewUserDialog,
	editUser,
	onSaveUser,
);
</script>

<UserDialog
  bind:open={showUserDialog}
  user={selectedUser}
  onSave={onSaveUser}
/>

<PageContent>
  <PageHeader title={t("pages.users.title")} icon={Users}>
    <Button type="button" class="rounded-lg" onclick={openNewUserDialog}>
      {t("pages.users.add")}
    </Button>
  </PageHeader>

  <Card
    class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
  >
    <div class="overflow-x-auto">
      <Table class="min-w-full">
        <TableHeader>
          <TableRow
            class="border-0 text-xs uppercase tracking-[0.22em] text-muted-foreground"
          >
            <TableHead class="rounded-l-xl">{t("common.username")}</TableHead>
            <TableHead>{t("common.role")}</TableHead>
            <TableHead class="rounded-r-xl text-right"
              >{t("common.actions")}</TableHead
            >
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each users as user}
            <TableRow class="border-b border-outline-soft/40 text-sm">
              <TableCell>
                <div class="flex items-center gap-3 text-foreground">
                  <span
                    class="grid size-9 place-items-center rounded-full border border-outline-soft/60 bg-surface-strong text-sm font-semibold uppercase"
                  >
                    {user.username?.slice(0, 2) ?? "--"}
                  </span>
                  <div class="flex flex-col text-sm">
                    <span class="font-medium">{user.username}</span>
                    {#if user.email}
                      <span class="text-xs text-muted-foreground"
                        >{user.email}</span
                      >
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell class="capitalize">
                <div
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
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
