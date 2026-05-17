import { toast } from "svelte-sonner";
import { invalidateAll } from "$app/navigation";
import { t } from "$lib/i18n/index.svelte";

type Result = { error?: unknown } | undefined;

/**
 * Run an async mutation, show a success toast, and refresh server data.
 * On error, log and show an error toast. Returns true on success, false on failure.
 *
 * Accepts thenables (e.g. Supabase query builders) as well as plain Promises.
 */
export async function runCrud(fn: () => PromiseLike<Result> | Result): Promise<boolean> {
	try {
		const result = await fn();
		if (result && "error" in result && result.error) throw result.error;
		toast.success(t("common.success"));
		await invalidateAll();
		return true;
	} catch (err) {
		console.error(err);
		toast.error(t("common.error"));
		return false;
	}
}
