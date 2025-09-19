<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  const DropdownMenu = DropdownMenuPrimitive.Root;
  import DropdownMenuContent from '$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte';
  import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
  import DropdownMenuTrigger from '$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { t } from '$lib/i18n';
  const __props = $props<{ limit?: number }>();
  let { limit = 5 } = __props;
  let orders: Array<{ id: string; total_amount: number; created_at: string }> = $state([]);

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('id,total_amount,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    orders = (data as any) ?? [];
  }

  $effect(() => { load(); });
</script>

{#if orders.length === 0}
  <div class="text-sm text-muted-foreground">{t('orders.none')}</div>
{:else}
  <div class="space-y-2">
    {#each orders as r}
      <div class="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
          <div class="text-sm">
              <span class="font-mono text-xs">#{r.id.slice(0,8)}</span> — <span class="font-semibold">€{Number(r.total_amount).toFixed(2)}</span>
              <div class="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" class="h-8 w-8">...</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuItem>{t('orders.viewDetails')}</DropdownMenuItem>
                  <DropdownMenuItem>{t('orders.printReceipt')}</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
      </div>
    {/each}
  </div>
{/if}


