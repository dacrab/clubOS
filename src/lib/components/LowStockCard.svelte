<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardDescription from "$lib/components/ui/card/card-description.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";

const props = $props<{ threshold?: number }>();
const { threshold = 3 } = props;
let items: Array<{ id: string; name: string; stock_quantity: number }> = $state(
  []
);

async function load() {
  const { data } = await supabase
    .from("products")
    .select("id,name,stock_quantity")
    .order("stock_quantity", { ascending: true })
    .lte("stock_quantity", threshold)
    .neq("stock_quantity", -1);
  items = (data as any) ?? [];
}

$effect(() => {
  load();
});
</script>

<Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
  <CardHeader class="flex flex-col gap-2 border-b border-outline-soft/60 p-5">
    <div class="flex items-center justify-between">
      <CardTitle class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t("inventory.lowStock.title")}
      </CardTitle>
      <Badge variant="secondary" class="rounded-full px-3 py-1 text-xs font-medium">
        {items.length}
      </Badge>
    </div>
    <CardDescription class="text-xs text-muted-foreground">
      {t("inventory.lowStock.subtitle") ?? t("inventory.lowStock.empty")}
    </CardDescription>
  </CardHeader>
  <CardContent class="p-5">
    {#if items.length === 0}
      <div class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-soft/60 bg-surface-strong/40 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("inventory.lowStock.empty")}
      </div>
    {:else}
      <ul class="space-y-2">
        {#each items as it}
          <li class="rounded-2xl border border-outline-soft/50 bg-surface-strong/40 px-4 py-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <span class="block truncate font-medium text-foreground">{it.name}</span>
                <span class="text-xs text-muted-foreground">{t("inventory.lowStock.threshold") ?? ""}</span>
              </div>
              <Badge variant={it.stock_quantity <= 1 ? "destructive" : "secondary"} class="badge-pill">
                {it.stock_quantity}
              </Badge>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
