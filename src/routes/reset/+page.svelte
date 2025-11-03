<script lang="ts">
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";

let password = $state("");
let confirm = $state("");
let loading = $state(false);
let errorMessage = $state("");

async function updatePassword(e?: Event) {
	e?.preventDefault();
	errorMessage = "";
	if (!(password && confirm)) {
		errorMessage = t("reset.missingFields");
		toast.error(errorMessage);
		return;
	}
	if (password !== confirm) {
		errorMessage = t("reset.mismatch");
		toast.error(errorMessage);
		return;
	}
	loading = true;
	try {
		const { error } = await supabase.auth.updateUser({ password });
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(t("reset.updated"));
		await goto("/");
	} finally {
		loading = false;
	}
}
((..._args: unknown[]) => {
	return;
})(Button, Card, CardContent, Input, Label, t, updatePassword);
</script>

<div
  class="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4"
>
  <Card
    class="w-full rounded-2xl border border-outline-soft/70 bg-surface-strong/80 shadow-md backdrop-blur"
  >
    <CardContent class="space-y-6 p-8">
      <form onsubmit={updatePassword} class="flex flex-col gap-5">
        <div class="space-y-2">
          <Label class="text-[13px] font-medium text-muted-foreground/90"
            >{t("users.newPasswordPlaceholder")}</Label
          >
          <Input
            type="password"
            bind:value={password}
            autocomplete="new-password"
            class="h-12 rounded-xl border-outline-soft bg-background/90 text-sm"
          />
        </div>
        <div class="space-y-2">
          <Label class="text-[13px] font-medium text-muted-foreground/90"
            >{t("common.password")}</Label
          >
          <Input
            type="password"
            bind:value={confirm}
            autocomplete="new-password"
            class="h-12 rounded-xl border-outline-soft bg-background/90 text-sm"
          />
        </div>
        {#if errorMessage}
          <p class="text-sm text-destructive">{errorMessage}</p>
        {/if}
        <Button
          type="submit"
          class="h-12 rounded-xl text-sm font-semibold"
          disabled={loading}
          aria-busy={loading}
        >
          {#if loading}{t("dashboard.admin.closing")}{:else}{t(
              "users.newPasswordPlaceholder",
            )}{/if}
        </Button>
      </form>
    </CardContent>
  </Card>
</div>
