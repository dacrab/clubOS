<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  const __props = $props<{ threshold?: number }>();
  let { threshold = 5 } = __props;

  let items: Array<{ id: string; name: string; stock_quantity: number }> = $state([]);

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id,name,stock_quantity')
      .order('stock_quantity', { ascending: true })
      .limit(20);
    const list = (data as any) ?? [];
    items = list.filter((p: any) => p.stock_quantity !== -1 && p.stock_quantity <= threshold);
  }

  $effect(() => { load(); });
</script>

<Card>
  <CardHeader>
    <CardTitle>{t('inventory.lowStock.title')}</CardTitle>
    <div class="text-xs text-muted-foreground">{t('inventory.lowStock.limitPrefix')} {threshold} {t('inventory.lowStock.items')}</div>
  </CardHeader>
  <CardContent>
    {#if items.length === 0}
      <div class="text-sm text-muted-foreground">{t('inventory.lowStock.empty')}</div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each items as p}
          <div class="flex items-center justify-between rounded-md border px-3 py-2">
            <div class="truncate">{p.name}</div>
            <div class="text-xs font-mono">{p.stock_quantity}</div>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>
