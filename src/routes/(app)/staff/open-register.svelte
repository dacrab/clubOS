<script lang="ts">
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { registerState } from "$lib/state/register.svelte";
import { supabase } from "$lib/utils/supabase";

let openingCash = $state("");
let saving = $state(false);

async function openNow() {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	saving = true;
	try {
		const sessionId = await registerState.ensureOpenSession(user.id);
		await supabase
			.from("register_sessions")
			.update({ notes: { opening_cash: Number(openingCash || 0) } })
			.eq("id", sessionId);
	} finally {
		saving = false;
	}
}
</script>

<div
  class="flex items-center gap-3 rounded-2xl border border-outline-soft bg-surface px-4 py-3"
>
  <Input
    class="w-40 rounded-xl border-outline-soft bg-background"
    type="number"
    step="0.01"
    min="0"
    placeholder="Opening cash €"
    bind:value={openingCash}
  />
  <Button
    type="button"
    variant="outline"
    class="rounded-full"
    onclick={openNow}
    disabled={saving}
  >
    Open
  </Button>
</div>
