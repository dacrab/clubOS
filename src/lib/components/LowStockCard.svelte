<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "$lib/components/ui/card";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";

const __props = $props<{ threshold?: number }>();
const { threshold = 3 } = __props;
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

<Card>
  <CardHeader><CardTitle>{t('inventory.lowStock.title')}</CardTitle></CardHeader>
  <CardContent>
    {#if items.length === 0}
      <div class="text-sm text-muted-foreground">{t('inventory.lowStock.empty')}</div>
    {:else}
      <ul class="space-y-1 text-sm">
        {#each items as it}
          <li class="flex justify-between items-center">
            <span>{it.name}</span>
            <Badge>{it.stock_quantity}</Badge>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
