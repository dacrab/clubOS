<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { ensureOpenSession } from '$lib/register';
  let openingCash = $state('');
  let saving = $state(false);

  async function openNow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');
    saving = true;
    try {
      const sessionId = await ensureOpenSession(supabase, user.id);
      // store opening cash in session notes
      await supabase.from('register_sessions').update({ notes: { opening_cash: Number(openingCash || 0) } }).eq('id', sessionId);
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex gap-2 items-center">
  <input class="border p-2 rounded w-40" type="number" step="0.01" placeholder="Opening cash €" bind:value={openingCash} />
  <button class="border rounded px-3 py-1" onclick={openNow} disabled={saving}>Open</button>
</div>


