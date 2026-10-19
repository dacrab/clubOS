import { toast } from "svelte-sonner";
import { t } from "#lib/i18n/index.svelte.js";
import { refreshAll } from "$app/navigation";

type Result = { error?: unknown };

export async function runCrud(
	fn: () => Result | Promise<Result | undefined>,
	options?: { skipInvalidate?: boolean },
): Promise<boolean> {
	try {
		const result = await fn();
		if (result?.error)
			throw result.error instanceof Error ? result.error : new Error(String(result.error));
		toast.success(t("common.success"));
		if (!options?.skipInvalidate) await refreshAll();
		return true;
	} catch (err) {
		toast.error(err instanceof Error ? err.message : t("common.error"));
		return false;
	}
}
