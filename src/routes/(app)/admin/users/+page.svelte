<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import PageHeader from "$lib/components/layout/page-header.svelte";
	import EmptyState from "$lib/components/layout/empty-state.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import Card, { CardContent } from "$lib/components/ui/card/card.svelte";
	import FormDialog from "$lib/components/ui/form-dialog/form-dialog.svelte";
	import Select from "$lib/components/ui/select/select.svelte";
	import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
	import SelectContent from "$lib/components/ui/select/select-content.svelte";
	import SelectItem from "$lib/components/ui/select/select-item.svelte";
	import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table/table.svelte";
	import { Plus, Pencil, Trash2, Users } from "@lucide/svelte";
	import type { UserView, UserForm, MemberRole } from "$lib/types/database";
	import { getRoleBadgeVariant } from "$lib/utils/helpers";

	const { data } = $props();

	const ROLES: MemberRole[] = ["owner", "admin", "manager", "staff"];
	const getRoleLabel = (role: MemberRole) => t(`users.roles.${role}`);

	let open = $state(false);
	let editing = $state<UserView | null>(null);
	let form = $state<UserForm>({ full_name: "", email: "", password: "", role: "staff" });
	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const { error } = editing
				? await users.update(editing.id, { full_name: form.full_name, role: form.role, ...(form.password ? { password: form.password } : {}) })
				: await users.create({ email: form.email, full_name: form.full_name, password: form.password, role: form.role });
			if (error) throw error;
			open = false;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch (err) {
			console.error(err);
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}

	async function remove(user: UserView) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", user.full_name ?? user.email))) return;
		try {
			const { error } = await users.remove(user.id);
			if (error) throw error;
			toast.success(t("common.success"));
			await invalidateAll();
		} catch (err) {
			console.error(err);
			toast.error(t("common.error"));
		}
	}

</script>

<div class="space-y-6">
	<PageHeader title={t("users.title")} description={t("users.subtitle")}>
		{#snippet actions()}<Button onclick={() => { editing = null; form = { full_name: "", email: "", password: "", role: "staff" }; open = true; }}><Plus class="mr-2 h-4 w-4" />{t("users.addUser")}</Button>{/snippet}
	</PageHeader>

	{#if data.users.length === 0}
		<Card><CardContent class="pt-6">
			<EmptyState title={t("users.empty.title")} description={t("users.empty.description")} icon={Users}>
				{#snippet actions()}<Button onclick={() => { editing = null; form = { full_name: "", email: "", password: "", role: "staff" }; open = true; }}><Plus class="mr-2 h-4 w-4" />{t("users.addUser")}</Button>{/snippet}
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
							<TableCell><Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge></TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => { editing = user; form = { full_name: user.full_name ?? "", email: user.email, password: "", role: user.role }; open = true; }} aria-label={t("common.edit")}><Pencil class="h-4 w-4" /></Button>
									{#if user.role !== "owner"}<Button variant="ghost" size="icon-sm" onclick={() => remove(user)} aria-label={t("common.delete")}><Trash2 class="h-4 w-4" /></Button>{/if}
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<FormDialog bind:open title={editing ? t("users.editUser") : t("users.addUser")} {saving} onsubmit={save} onclose={() => open = false}>
	<div class="space-y-2"><Label for="full_name">{t("users.fullName")}</Label><Input id="full_name" bind:value={form.full_name} required /></div>
	{#if !editing}
		<div class="space-y-2"><Label for="email">{t("users.email")}</Label><Input id="email" type="email" bind:value={form.email} required /></div>
	{/if}
	<div class="space-y-2">
		<Label for="password">{editing ? t("users.changePassword") : t("auth.password")}</Label>
		<Input id="password" type="password" bind:value={form.password} placeholder={editing ? t("users.leaveBlank") : ""} required={!editing} />
	</div>
	<div class="space-y-2">
		<Label>{t("users.role")}</Label>
		<Select bind:value={form.role}>
			<SelectTrigger selected={getRoleLabel(form.role)} />
			<SelectContent>{#each ROLES as role (role)}<SelectItem value={role}>{getRoleLabel(role)}</SelectItem>{/each}</SelectContent>
		</Select>
	</div>
</FormDialog>
