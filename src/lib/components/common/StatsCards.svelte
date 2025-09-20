<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  let { items } = $props<{ items: Array<{ title: string; value: string; accent?: 'green'|'blue'|'red'|'yellow'; icon?: any }> }>();

  function accentClass(accent?: string) {
    if (accent === 'green') return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
    if (accent === 'blue') return 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200';
    if (accent === 'red') return 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200';
    if (accent === 'yellow') return 'bg-yellow-50 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200';
    return '';
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  {#each items as it}
    <Card class={accentClass(it.accent)}>
      <CardHeader class="py-2 flex items-center justify-between gap-2">
        <CardTitle class="text-sm">{it.title}</CardTitle>
        {#if it.icon}
          <it.icon class="size-4 opacity-70" />
        {/if}
      </CardHeader>
      <CardContent class="pt-0"><div class="text-2xl font-bold tracking-tight">{it.value}</div></CardContent>
    </Card>
  {/each}
</div>
