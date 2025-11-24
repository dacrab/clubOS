<script lang="ts">
import { Pencil, Shield, Users } from "@lucide/svelte";
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
import { tt as t } from "$lib/state/i18n.svelte";
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
	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id;
	if (!uid) {
		users = [];
		return;
	}
	const facilityId = await facilityState.resolveSelected();
	if (!facilityId) {
		users = [];
		return;
	}
	// Load user ids that belong to this facility, then fetch users with IN()
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

// token derivation moved server-side

async function errorToast(message: string) {
	const { toast } = await import("svelte-sonner");
	toast.error(message);
}

function patchUser(payload: AdminUser) {
	return fetch("/api/admin/users", {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(payload),
	});
}

function postUser(payload: AdminUser) {
	return fetch("/api/admin/users", {
		method: "POST",
		headers: {
			"content-type": "application/json",
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
	if (user.id) {
		const payload = buildPatchPayload(user);
		const res = await patchUser(payload);
		if (!res.ok) {
			await errorToast(await res.text());
			return;
		}
	} else {
		const createPayload = buildCreatePayload(user);
		const res = await postUser(createPayload);
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
  <PageHeader title={t("users.title")} icon={Users}>
    <Button type="button" class="rounded-lg" onclick={openNewUserDialog}>
      {t("users.add")}
    </Button>
  </PageHeader>

  <Card
    class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
  >
    <div class="overflow-x-auto">
      <Table class="min-w-full">
        <TableHeader>
          <TableRow
            class="border-0 text-xs uppercase text-muted-foreground"
          >
            <TableHead class="rounded-l-xl">{t("common.username")}</TableHead>
            <TableHead>{t("common.role")}</TableHead>
            <TableHead class="rounded-r-xl text-right"
              >{t("common.actions")}</TableHead
            >
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if users.length === 0}
            <TableRow>
              <TableCell
                colspan={3}
                class="py-16 text-center"
              >
                <div
                  class="mx-auto flex max-w-sm flex-col items-center gap-4 text-center"
                >
                  <div
                    class="grid size-16 place-items-center rounded-full bg-muted/30"
                  >
                    <Users class="size-8 text-muted-foreground/60" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <h3 class="text-base font-semibold text-foreground">
                      {t("users.empty.title")}
                    </h3>
                    <p class="text-sm text-muted-foreground">
                      {t("users.empty.description")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    class="rounded-lg"
                    onclick={openNewUserDialog}
                  >
                    {t("users.add")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          {:else}
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
          {/if}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>
