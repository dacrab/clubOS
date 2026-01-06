/**
 * Reusable CRUD state helper
 * Eliminates repetitive dialog/form/save/delete boilerplate
 */

import { toast } from "svelte-sonner";
import { invalidateAll } from "$app/navigation";
import { t } from "$lib/i18n/index.svelte";

export type CrudConfig<T, F> = {
	/** Convert item to form data for editing */
	toForm: (item: T | null) => F;
	/** Create new item */
	onCreate?: (form: F) => Promise<{ error: unknown }>;
	/** Update existing item */
	onUpdate?: (id: string, form: F) => Promise<{ error: unknown }>;
	/** Delete item */
	onDelete?: (id: string) => Promise<{ error: unknown }>;
	/** Get item ID */
	getId: (item: T) => string;
	/** Get item name for delete confirmation */
	getName?: (item: T) => string;
};

type CrudReturn<T, F> = {
	open: boolean;
	editing: T | null;
	form: F;
	saving: boolean;
	isEdit: boolean;
	openCreate: () => void;
	openEdit: (item: T) => void;
	close: () => void;
	save: () => Promise<boolean>;
	remove: (item: T) => Promise<boolean>;
};

export function createCrud<T, F>(config: CrudConfig<T, F>): CrudReturn<T, F> {
	let open = $state(false);
	let editing = $state<T | null>(null);
	let form = $state<F>(config.toForm(null));
	let saving = $state(false);

	return {
		get open() { return open; },
		set open(v: boolean) { open = v; },
		get editing() { return editing; },
		get form() { return form; },
		set form(v: F) { form = v; },
		get saving() { return saving; },
		get isEdit() { return editing !== null; },

		openCreate() {
			editing = null;
			form = config.toForm(null);
			open = true;
		},

		openEdit(item: T) {
			editing = item;
			form = config.toForm(item);
			open = true;
		},

		close() {
			open = false;
		},

		async save(): Promise<boolean> {
			saving = true;
			try {
				const { error } = editing
					? await (config.onUpdate?.(config.getId(editing), form) ?? { error: null })
					: await (config.onCreate?.(form) ?? { error: null });
				if (error) throw error;
				toast.success(t("common.success"));
				open = false;
				await invalidateAll();
				return true;
			} catch {
				toast.error(t("common.error"));
				return false;
			} finally {
				saving = false;
			}
		},

		async remove(item: T): Promise<boolean> {
			const name = config.getName?.(item) ?? "";
			if (!confirm(t("common.deleteConfirm").replace("{name}", name))) return false;
			try {
				const { error } = await (config.onDelete?.(config.getId(item)) ?? { error: null });
				if (error) throw error;
				toast.success(t("common.success"));
				await invalidateAll();
				return true;
			} catch {
				toast.error(t("common.error"));
				return false;
			}
		},
	};
}
