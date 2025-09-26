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

<header class="flex flex-col gap-4 rounded-2xl border border-outline-soft/70 bg-surface-soft/80 px-5 py-5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      {#if Icon}
        <span class="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shadow-inner">
          <Icon class="size-4" />
        </span>
      {/if}
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
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
</header>
