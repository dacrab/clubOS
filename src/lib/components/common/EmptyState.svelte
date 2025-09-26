<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardDescription from "$lib/components/ui/card/card-description.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";

const { title, description, icon, actionLabel, onAction, badge, children } =
  $props<{
    title: string;
    description?: string;
    icon?: any;
    actionLabel?: string;
    onAction?: () => void;
    badge?: string;
    children?: any;
  }>();
</script>

<Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/90 shadow-sm">
  <CardHeader class="flex flex-col gap-3 rounded-t-2xl border-b border-outline-soft/50 bg-background/70 px-6 py-5">
    <div class="flex items-center gap-4">
      <div class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        {#if icon}
          <icon class="size-5"></icon>
        {:else}
          <span class="mx-auto size-2 rounded-full bg-primary"></span>
        {/if}
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <CardTitle class="truncate text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        {#if description}
          <CardDescription class="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        {/if}
      </div>
      {#if badge}
        <Badge variant="outline" class="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </Badge>
      {/if}
    </div>
  </CardHeader>
  <CardContent class="flex flex-col gap-4 px-6 py-6 text-sm text-muted-foreground">
    {@render children?.()}
    {#if actionLabel}
      <Button
        type="button"
        class="self-start rounded-lg px-5 py-2 text-sm font-medium"
        onclick={onAction}
        disabled={!onAction}
      >
        {actionLabel}
      </Button>
    {/if}
  </CardContent>
</Card>
