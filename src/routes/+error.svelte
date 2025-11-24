<script lang="ts">
import { page } from "$app/state";
import { Button } from "$lib/components/ui/button";
import { tt as t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";
import { Home as HomeIcon } from "@lucide/svelte";

let homeHref = $state("/admin");

$effect(() => {
	(async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				homeHref = "/";
				return;
			}
			const role =
				(user.user_metadata?.["role"] as string | undefined) ?? undefined;
			homeHref =
				role === "staff"
					? "/staff"
					: role === "secretary"
						? "/secretary"
						: "/admin";
		} catch {
			/* ignore */
		}
	})();
});
</script>

<div class="relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
    <div class="pointer-events-none absolute inset-x-0 top-16 -z-10 mx-auto h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
	<div class="flex flex-col items-center gap-3">
		<div class="text-7xl font-extrabold tracking-tight text-primary">404</div>
		<h1 class="text-2xl font-semibold text-foreground">{t("errors.notFound.title")}</h1>
		<p class="max-w-prose text-sm text-muted-foreground">
			{page.status === 404 ? t("errors.notFound.description") : t("errors.generic")}
		</p>
	</div>
	<div class="flex items-center gap-3">
		<Button href={homeHref} class="rounded-xl px-4 py-2">
			<HomeIcon class="mr-2 h-4 w-4" />
			{t("errors.goHome")}
		</Button>
	</div>
</div>


