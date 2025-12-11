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
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "$lib/components/ui/dialog";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { Plus, Pencil, Trash2, Users } from "@lucide/svelte";
	import type { MemberRole } from "$lib/types/database";

	interface UserWithMembership {
		id: string;
		email: string;
		full_name: string | null;
		role: MemberRole;
	}

	const { data } = $props();

	let showDialog = $state(false);
	let editingUser = $state<UserWithMembership | null>(null);
	let formData = $state({
		full_name: "",
		email: "",
		password: "",
		role: "staff" as MemberRole,
	});
	let saving = $state(false);

	const ROLES: { value: MemberRole; labelKey: string }[] = [
		{ value: "owner", labelKey: "users.roles.owner" },
		{ value: "admin", labelKey: "users.roles.admin" },
		{ value: "manager", labelKey: "users.roles.manager" },
		{ value: "staff", labelKey: "users.roles.staff" },
	];

	const getRoleLabel = (role: MemberRole) => t(`users.roles.${role}`);

	const getRoleBadgeVariant = (role: MemberRole) => {
		switch (role) {
			case "owner":
				return "destructive" as const;
			case "admin":
				return "default" as const;
			case "manager":
				return "secondary" as const;
			default:
				return "outline" as const;
		}
	};

	function openDialog(user?: UserWithMembership) {
		editingUser = user ?? null;
		formData = user
			? {
					full_name: user.full_name ?? "",
					email: user.email,
					password: "",
					role: user.role,
				}
			: {
					full_name: "",
					email: "",
					password: "",
					role: "staff",
				};
		showDialog = true;
	}

	async function handleSave() {
		if (!formData.full_name) {
			toast.error(t("common.error"));
			return;
		}

		saving = true;

		try {
			if (editingUser) {
				// Update existing user
				const res = await fetch("/api/admin/users", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: editingUser.id,
						full_name: formData.full_name,
						role: formData.role,
						password: formData.password || undefined,
					}),
				});
				if (!res.ok) throw new Error();
			} else {
				// Create new user
				if (!formData.email || !formData.password) {
					toast.error(t("common.error"));
					saving = false;
					return;
				}

				const res = await fetch("/api/admin/users", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: formData.email,
						full_name: formData.full_name,
						password: formData.password,
						role: formData.role,
					}),
				});
				if (!res.ok) throw new Error();
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

	async function handleDelete(user: UserWithMembership) {
		if (!confirm(t("common.deleteConfirm").replace("{name}", user.full_name ?? user.email))) {
			return;
		}

		try {
			const res = await fetch("/api/admin/users", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: user.id }),
			});

			if (!res.ok) throw new Error();

			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		}
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("users.title")} description={t("users.subtitle")}>
		{#snippet actions()}
			<Button onclick={() => openDialog()}>
				<Plus class="mr-2 h-4 w-4" />
				{t("users.addUser")}
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.users.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState title={t("users.empty.title")} description={t("users.empty.description")} icon={Users}>
					{#snippet actions()}
						<Button onclick={() => openDialog()}>
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
						<TableHead>{t("users.fullName")}</TableHead>
						<TableHead>{t("users.email")}</TableHead>
						<TableHead>{t("users.role")}</TableHead>
						<TableHead class="w-24">{t("common.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.users as user (user.id)}
						<TableRow>
							<TableCell class="font-medium">{user.full_name ?? "-"}</TableCell>
							<TableCell class="text-muted-foreground">{user.email}</TableCell>
							<TableCell>
								<Badge variant={getRoleBadgeVariant(user.role)}>
									{getRoleLabel(user.role)}
								</Badge>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openDialog(user)}>
										<Pencil class="h-4 w-4" />
									</Button>
									{#if user.role !== "owner"}
										<Button variant="ghost" size="icon-sm" onclick={() => handleDelete(user)}>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>

<Dialog bind:open={showDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{editingUser ? t("users.editUser") : t("users.addUser")}</DialogTitle>
		</DialogHeader>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="full_name">{t("users.fullName")}</Label>
				<Input id="full_name" bind:value={formData.full_name} required />
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
						{#each ROLES as role (role.value)}
							<SelectItem value={role.value}>{t(role.labelKey)}</SelectItem>
						{/each}
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
