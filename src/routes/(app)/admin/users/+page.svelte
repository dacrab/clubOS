<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";
	import { Card, CardContent } from "$lib/components/ui/card";
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter,
	} from "$lib/components/ui/dialog";
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
	} from "$lib/components/ui/select";
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell,
	} from "$lib/components/ui/table";
	import { Plus, Pencil, Trash2, Users } from "@lucide/svelte";
	import type { User } from "$lib/types/database";

	const { data } = $props();

	let showDialog = $state(false);
	let editingUser = $state<User | null>(null);
	let formData = $state({
		username: "",
		email: "",
		password: "",
		role: "staff" as User["role"],
	});
	let saving = $state(false);

	function getRoleLabel(role: string) {
		const labels: Record<string, string> = {
			admin: t("users.roles.admin"),
			secretary: t("users.roles.secretary"),
			staff: t("users.roles.staff"),
		};
		return labels[role] || role;
	}

	function openNewDialog() {
		editingUser = null;
		formData = { username: "", email: "", password: "", role: "staff" };
		showDialog = true;
	}

	function openEditDialog(user: User & { email?: string }) {
		editingUser = user;
		formData = {
			username: user.username,
			email: user.email ?? "",
			password: "",
			role: user.role,
		};
		showDialog = true;
	}

	async function handleSave() {
		if (!formData.username) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;
		try {
			if (editingUser) {
				// Update user via API
				const response = await fetch("/api/admin/users", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: editingUser.id,
						username: formData.username,
						role: formData.role,
						password: formData.password || undefined,
					}),
				});

				if (!response.ok) throw new Error("Failed to update user");
			} else {
				// Create new user via API
				if (!formData.email || !formData.password) {
					toast.error(t("common.error"));
					return;
				}

				const response = await fetch("/api/admin/users", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: formData.email,
						username: formData.username,
						password: formData.password,
						role: formData.role,
					}),
				});

				if (!response.ok) throw new Error("Failed to create user");
			}

			toast.success(t("common.success"));
			showDialog = false;
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}

	async function handleDelete(user: User) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", user.username))) return;

		try {
			const response = await fetch("/api/admin/users", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: user.id }),
			});

			if (!response.ok) throw new Error("Failed to delete user");
			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}

	function getRoleBadgeVariant(role: string) {
		if (role === "admin") return "default" as const;
		if (role === "secretary") return "secondary" as const;
		return "outline" as const;
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("users.title")} description={t("users.subtitle")}>
		{#snippet actions()}
			<Button onclick={openNewDialog}>
				<Plus class="mr-2 h-4 w-4" />
				{t("users.addUser")}
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.users.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t("users.empty.title")}
					description={t("users.empty.description")}
					icon={Users}
				>
					{#snippet actions()}
						<Button onclick={openNewDialog}>
							<Plus class="mr-2 h-4 w-4" />
							{t("users.addUser")}
						</Button>
					{/snippet}
				</EmptyState>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("users.username")}</TableHead>
						<TableHead>{t("users.role")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.users as user (user.id)}
						<TableRow>
							<TableCell class="font-medium">{user.username}</TableCell>
							<TableCell>
								<Badge variant={getRoleBadgeVariant(user.role)}>
									{t(`users.roles.${user.role}`)}
								</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => openEditDialog(user)}
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => handleDelete(user)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<!-- User Dialog -->
<Dialog bind:open={showDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>
				{editingUser ? t("users.editUser") : t("users.addUser")}
			</DialogTitle>
		</DialogHeader>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="username">{t("users.username")}</Label>
				<Input id="username" bind:value={formData.username} required />
			</div>

			{#if !editingUser}
				<div class="space-y-2">
					<Label for="email">{t("users.email")}</Label>
					<Input id="email" type="email" bind:value={formData.email} required />
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="password">
					{editingUser ? t("users.changePassword") : t("auth.password")}
				</Label>
				<Input
					id="password"
					type="password"
					bind:value={formData.password}
					placeholder={editingUser ? t("users.leaveBlank") : ""}
					required={!editingUser}
				/>
			</div>

			<div class="space-y-2">
				<Label>{t("users.role")}</Label>
				<Select bind:value={formData.role}>
					<SelectTrigger selected={getRoleLabel(formData.role)} />
					<SelectContent>
						<SelectItem value="admin">{t("users.roles.admin")}</SelectItem>
						<SelectItem value="secretary">{t("users.roles.secretary")}</SelectItem>
						<SelectItem value="staff">{t("users.roles.staff")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showDialog = false)}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? t("common.loading") : t("common.save")}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
