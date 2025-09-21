<script lang="ts">
import { closeRegister, ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";

type SessionRow = {
  id: string;
  opened_at: string;
  opened_by: string;
  closed_at: string | null;
  notes: { opening_cash?: number } | null;
};
type ClosingRow = {
  session_id: string;
  cash_sales_total: number;
  card_sales_total: number;
  treat_total: number;
  total_discounts: number;
  notes: Record<string, unknown> | null;
};

let sessions: Array<SessionRow> = $state([]);
let closingsBySession: Record<string, ClosingRow | undefined> = $state({});
let openingCash = $state("");
let closing = $state<string | null>(null);

$effect(() => {
  loadCurrentUser().then(() => {
    const u = $currentUser;
    if (!u) {
      window.location.href = "/login";
      return;
    }
    if (u.role !== "admin") window.location.href = "/dashboard";
    load();
  });
});

async function load() {
  const { data } = await supabase
    .from("register_sessions")
    .select("id, opened_at, opened_by, closed_at, notes")
    .order("opened_at", { ascending: false })
    .limit(
      (() => {
        const LIMIT_RECENT = 20;
        return LIMIT_RECENT;
      })()
    );
  sessions = (data as unknown as SessionRow[]) ?? [];

  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    closingsBySession = {};
    return;
  }
  const { data: closings } = await supabase
    .from("register_closings")
    .select(
      "session_id, cash_sales_total, card_sales_total, treat_total, total_discounts, notes"
    )
    .in("session_id", sessionIds);
  const map: Record<string, ClosingRow> = {};
  for (const c of (closings as unknown as ClosingRow[]) ?? []) {
    map[c.session_id] = c;
  }
  closingsBySession = map;
}

async function openRegister() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }
  const id = await ensureOpenSession(supabase, user.id);
  await supabase
    .from("register_sessions")
    .update({ notes: { opening_cash: Number(openingCash || 0) } })
    .eq("id", id);
  openingCash = "";
  load();
}

async function closeSession(id: string) {
  closing = id;
  try {
    await closeRegister(supabase, id, null);
    await load();
  } finally {
    closing = null;
  }
}
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Register Sessions</h1>
  <div class="flex items-center gap-2">
    <input class="border p-2 rounded w-40" type="number" step="0.01" placeholder="Opening cash €" bind:value={openingCash} />
    <button class="border rounded px-3 py-1" onclick={openRegister}>Open (or reuse open)</button>
  </div>

  <table class="text-sm w-full border mt-4">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left p-2">ID</th>
        <th class="text-left p-2">Opened</th>
        <th class="text-left p-2">Closed</th>
        <th class="text-left p-2">Opening cash</th>
        <th class="text-left p-2">Expected cash</th>
        <th class="text-left p-2">Counted cash</th>
        <th class="text-left p-2">Difference</th>
        <th class="text-left p-2">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each sessions as s}
        <tr class="border-t">
          <td class="p-2">{s.id.slice(0,8)}</td>
          <td class="p-2">{new Date(s.opened_at).toLocaleString()}</td>
          <td class="p-2">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
          <td class="p-2">€{Number(s.notes?.opening_cash ?? 0).toFixed(2)}</td>
          {#if closingsBySession[s.id]}
            {#key s.id}
              {@const closing = closingsBySession[s.id]}
              {@const openingCash = Number(s.notes?.opening_cash ?? 0)}
              {@const expectedCash = openingCash + Number(closing?.cash_sales_total ?? 0)}
              {@const countedCash = Number((closing?.notes as any)?.final_cash ?? (closing?.notes as any)?.finalCash ?? 0)}
              {@const diff = countedCash - expectedCash}
              <td class="p-2">€{expectedCash.toFixed(2)}</td>
              <td class="p-2">€{countedCash.toFixed(2)}</td>
              <td class="p-2 {diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}">€{diff.toFixed(2)}</td>
            {/key}
          {:else}
            <td class="p-2">-</td>
            <td class="p-2">-</td>
            <td class="p-2">-</td>
          {/if}
          <td class="p-2">
            {#if !s.closed_at}
              <button class="border rounded px-2 py-1" onclick={() => closeSession(s.id)} disabled={closing===s.id}>
                {closing===s.id ? '...' : 'Close'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>


