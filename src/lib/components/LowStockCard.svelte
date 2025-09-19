<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import { t } from '$lib/i18n';
  const __props = $props<{ threshold?: number }>();
  let { threshold = 3 } = __props;
  let items: Array<{ id: string; name: string; stock_quantity: number }> = $state([]);

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id,name,stock_quantity')
      .order('stock_quantity', { ascending: true })
      .lte('stock_quantity', threshold)
      .neq('stock_quantity', -1);
    items = (data as any) ?? [];
  }

  $effect(() => { load(); });
</script>

<Card>
  <CardHeader><CardTitle>{t('inventory.lowStock.title')}</CardTitle></CardHeader>
  <CardContent>
    {#if items.length === 0}
      <div class="text-sm text-muted-foreground">{t('inventory.lowStock.empty')}</div>
    {:else}
      <ul class="space-y-1 text-sm">
        {#each items as it}
          <li class="flex justify-between"><span>{it.name}</span><span>{it.stock_quantity}</span></li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
