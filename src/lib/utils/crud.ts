import { toast } from "svelte-sonner";
import { invalidateAll } from "$app/navigation";
import { t } from "$lib/i18n/index.svelte";

type Result = { error?: unknown };

export async function runCrud(
	fn: () => PromiseLike<Result | undefined> | Result | undefined,
): Promise<boolean> {
	try {
		const result = await fn();
		if (result && "error" in result && result.error) throw result.error;
		toast.success(t("common.success"));
		await invalidateAll();
		return true;
	} catch (_err) {
		toast.error(t("common.error"));
		return false;
	}
}
