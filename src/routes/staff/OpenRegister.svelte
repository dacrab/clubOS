<script lang="ts">
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";

let openingCash = $state("");
let saving = $state(false);

async function openNow() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }
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

<div class="flex gap-2 items-center">
  <Input class="w-40" type="number" step="0.01" placeholder="Opening cash €" bind:value={openingCash} />
  <Button variant="outline" onclick={openNow} disabled={saving}>Open</Button>
</div>


