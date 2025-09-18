<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
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

<ul class="text-sm space-y-1">
  {#each orders as r}
    <li>#{r.id.slice(0,8)} — €{Number(r.total_amount).toFixed(2)} — {new Date(r.created_at).toLocaleString()}</li>
  {/each}
</ul>


