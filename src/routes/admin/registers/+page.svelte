<script lang="ts">
// no register mutations here
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";
import { t } from "$lib/i18n";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { DatePicker } from "$lib/components/ui/date-picker";
import { formatDateTime } from "$lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";

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
const dInit = new Date();
const yyyy = dInit.getFullYear();
const mm = String(dInit.getMonth() + 1).padStart(2, "0");
const dd = String(dInit.getDate()).padStart(2, "0");
let selectedDate = $state<string>(`${yyyy}-${mm}-${dd}`);

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
  const start = new Date(`${selectedDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { data } = await supabase
    .from("register_sessions")
    .select("id, opened_at, opened_by, closed_at, notes")
    .gte("opened_at", start.toISOString())
    .lt("opened_at", end.toISOString())
    .order("opened_at", { ascending: false });
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

// no close actions in this view
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">{t('pages.registers.title')}</h1>
  <div class="flex items-center gap-2">
    <DatePicker bind:value={selectedDate} ariaLabel={t('pages.registers.pickDate')} />
    <Button type="button" variant="outline" onclick={load}>{t('common.viewAll')}</Button>
  </div>

  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('pages.registers.id')}</TableHead>
          <TableHead>{t('pages.registers.opened')}</TableHead>
          <TableHead>{t('pages.registers.closed')}</TableHead>
          <TableHead>{t('pages.registers.coupons')}</TableHead>
          <TableHead>{t('pages.registers.treats')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each sessions as s}
          <TableRow>
            <TableCell>{s.id.slice(0,8)}</TableCell>
            <TableCell>{formatDateTime(s.opened_at)}</TableCell>
            <TableCell>{s.closed_at ? formatDateTime(s.closed_at) : '-'}</TableCell>
            {#if closingsBySession[s.id]}
              {#key s.id}
                {@const closing = closingsBySession[s.id]}
                <TableCell>€{Number(closing?.total_discounts ?? 0).toFixed(2)}</TableCell>
                <TableCell>€{Number(closing?.treat_total ?? 0).toFixed(2)}</TableCell>
              {/key}
            {:else}
              <TableCell>€0.00</TableCell>
              <TableCell>€0.00</TableCell>
            {/if}
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </Card>
</section>


