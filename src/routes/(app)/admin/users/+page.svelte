<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";
	import { Card, CardContent } from "$lib/components/ui/card";
	import { FormDialog } from "$lib/components/ui/form-dialog";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { createCrud } from "$lib/state/crud.svelte";
	import { users } from "$lib/services/db";
	import { Plus, Pencil, Trash2, Users } from "@lucide/svelte";
	import type { MemberRole } from "$lib/types/database";

	type User = { id: string; email: string; full_name: string | null; role: MemberRole };
	type UserForm = { full_name: string; email: string; password: string; role: MemberRole };

	const { data } = $props();

	const ROLES: MemberRole[] = ["owner", "admin", "manager", "staff"];
	const getRoleLabel = (role: MemberRole) => t(`users.roles.${role}`);
	const getRoleBadge = (role: MemberRole) => ({ owner: "destructive", admin: "default", manager: "secondary", staff: "outline" })[role] as "destructive" | "default" | "secondary" | "outline";

	const crud = createCrud<User, UserForm>({
		toForm: (u) => u
			? { full_name: u.full_name ?? "", email: u.email, password: "", role: u.role }
			: { full_name: "", email: "", password: "", role: "staff" },
		onCreate: (f) => users.create({ email: f.email, full_name: f.full_name, password: f.password, role: f.role }),
		onUpdate: (id, f) => users.update(id, { full_name: f.full_name, role: f.role, ...(f.password ? { password: f.password } : {}) }),
		onDelete: (id) => users.remove(id),
		getId: (u) => u.id,
		getName: (u) => u.full_name ?? u.email,
	});
</script>

<div class="space-y-6">
	<PageHeader title={t("users.title")} description={t("users.subtitle")}>
		{#snippet actions()}<Button onclick={() => crud.openCreate()}><Plus class="mr-2 h-4 w-4" />{t("users.addUser")}</Button>{/snippet}
	</PageHeader>

	{#if data.users.length === 0}
		<Card><CardContent class="pt-6">
			<EmptyState title={t("users.empty.title")} description={t("users.empty.description")} icon={Users}>
				{#snippet actions()}<Button onclick={() => crud.openCreate()}><Plus class="mr-2 h-4 w-4" />{t("users.addUser")}</Button>{/snippet}
			</EmptyState>
		</CardContent></Card>
	{:else}
		<Card>
			<Table>
				<TableHeader><TableRow>
					<TableHead>{t("users.fullName")}</TableHead>
					<TableHead>{t("users.email")}</TableHead>
					<TableHead>{t("users.role")}</TableHead>
					<TableHead class="w-24">{t("common.actions")}</TableHead>
				</TableRow></TableHeader>
				<TableBody>
					{#each data.users as user (user.id)}
						<TableRow>
							<TableCell class="font-medium">{user.full_name ?? "-"}</TableCell>
							<TableCell class="text-muted-foreground">{user.email}</TableCell>
							<TableCell><Badge variant={getRoleBadge(user.role)}>{getRoleLabel(user.role)}</Badge></TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => crud.openEdit(user)} aria-label={t("common.edit")}><Pencil class="h-4 w-4" /></Button>
									{#if user.role !== "owner"}<Button variant="ghost" size="icon-sm" onclick={() => crud.remove(user)} aria-label={t("common.delete")}><Trash2 class="h-4 w-4" /></Button>{/if}
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<FormDialog bind:open={crud.open} title={crud.isEdit ? t("users.editUser") : t("users.addUser")} saving={crud.saving} onsubmit={() => crud.save()} onclose={() => crud.close()}>
	<div class="space-y-2"><Label for="full_name">{t("users.fullName")}</Label><Input id="full_name" bind:value={crud.form.full_name} required /></div>
	{#if !crud.isEdit}
		<div class="space-y-2"><Label for="email">{t("users.email")}</Label><Input id="email" type="email" bind:value={crud.form.email} required /></div>
	{/if}
	<div class="space-y-2">
		<Label for="password">{crud.isEdit ? t("users.changePassword") : t("auth.password")}</Label>
		<Input id="password" type="password" bind:value={crud.form.password} placeholder={crud.isEdit ? t("users.leaveBlank") : ""} required={!crud.isEdit} />
	</div>
	<div class="space-y-2">
		<Label>{t("users.role")}</Label>
		<Select bind:value={crud.form.role}>
			<SelectTrigger selected={getRoleLabel(crud.form.role)} />
			<SelectContent>{#each ROLES as role (role)}<SelectItem value={role}>{getRoleLabel(role)}</SelectItem>{/each}</SelectContent>
		</Select>
	</div>
</FormDialog>
