<script lang="ts">
const {
  title,
  subtitle,
  icon: Icon,
  children,
} = $props<{
  title: string;
  subtitle?: string;
  icon?: any;
  children?: any;
}>();
</script>

<div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-soft bg-surface p-5 shadow-sm">
  <div class="flex items-center gap-3">
    {#if Icon}
      <div class="grid size-10 place-items-center rounded-xl border border-outline-soft bg-sidebar/40">
        <Icon class="size-4" />
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold tracking-tight">{title}</h1>
      {#if subtitle}
        <p class="text-sm text-muted-foreground">{subtitle}</p>
      {/if}
    </div>
  </div>
  {#if children}
    <div class="flex items-center gap-2">
      {@render children?.()}
    </div>
  {/if}
</div>
