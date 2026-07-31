import { toast } from "svelte-sonner";
import { invalidateAll } from "$app/navigation";
import { t } from "$lib/i18n/index.svelte";

type Result = { error?: unknown };

export async function runCrud(
	fn: () => Result | Promise<Result | undefined>,
	options?: { skipInvalidate?: boolean },
): Promise<boolean> {
	try {
		const result = await fn();
		if (result?.error) throw result.error;
		toast.success(t("common.success"));
		if (!options?.skipInvalidate) await invalidateAll();
		return true;
	} catch (err) {
		toast.error(err instanceof Error ? err.message : t("common.error"));
		return false;
	}
}
