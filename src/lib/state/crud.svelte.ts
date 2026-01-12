import { toast } from "svelte-sonner";
import { invalidateAll } from "$app/navigation";
import { t } from "$lib/i18n/index.svelte";

type CrudConfig<T, F> = {
	toForm: (item: T | null) => F;
	onCreate?: (form: F) => Promise<{ error: unknown }>;
	onUpdate?: (id: string, form: F) => Promise<{ error: unknown }>;
	onDelete?: (id: string) => Promise<{ error: unknown }>;
	getId: (item: T) => string;
	getName?: (item: T) => string;
};

export function createCrud<T, F>(config: CrudConfig<T, F>) {
	let open = $state(false);
	let editing = $state<T | null>(null);
	let form = $state<F>(config.toForm(null));
	let saving = $state(false);

	const success = async () => { toast.success(t("common.success")); await invalidateAll(); };
	const fail = () => toast.error(t("common.error"));

	return {
		get open() { return open; },
		set open(v) { open = v; },
		get editing() { return editing; },
		get form() { return form; },
		set form(v) { form = v; },
		get saving() { return saving; },
		get isEdit() { return editing !== null; },

		openCreate() { editing = null; form = config.toForm(null); open = true; },
		openEdit(item: T) { editing = item; form = config.toForm(item); open = true; },
		close() { open = false; },

		async save() {
			saving = true;
			try {
				const { error } = editing ? await (config.onUpdate?.(config.getId(editing), form) ?? { error: null }) : await (config.onCreate?.(form) ?? { error: null });
				if (error) throw error;
				open = false;
				await success();
				return true;
			} catch { fail(); return false; }
			finally { saving = false; }
		},

		async remove(item: T) {
			if (!confirm(t("common.deleteConfirm").replace("{name}", config.getName?.(item) ?? ""))) return false;
			try {
				const { error } = await (config.onDelete?.(config.getId(item)) ?? { error: null });
				if (error) throw error;
				await success();
				return true;
			} catch { fail(); return false; }
		},
	};
}
