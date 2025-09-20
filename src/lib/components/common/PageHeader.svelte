<script lang="ts">
  let { title, subtitle, icon, children } = $props<{ title: string; subtitle?: string; icon?: any; children?: any }>();
</script>

<div class="flex items-center justify-between gap-3">
  <div class="flex items-center gap-3">
    {#if icon}
      <div class="size-9 rounded-md border bg-muted flex items-center justify-center">
        <icon class="size-4"></icon>
      </div>
    {/if}
    <div>
      <h1 class="text-2xl font-semibold leading-tight">{title}</h1>
      {#if subtitle}
        <p class="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      {/if}
    </div>
  </div>
  <div class="flex items-center gap-2">
    {@render children?.()}
  </div>
  
</div>
