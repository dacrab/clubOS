<script lang="ts">
import Button from "$lib/components/ui/button/button.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import { ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabase-client";

let openingCash = $state("");
let saving = $state(false);

async function openNow() {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	saving = true;
	try {
		const sessionId = await ensureOpenSession(supabase, user.id);
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
