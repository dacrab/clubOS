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

<Card class="empty-card">
  <CardHeader class="empty-card__header">
    <div class="empty-card__icon">
      {#if icon}
        <icon class="h-6 w-6"></icon>
      {:else}
        <span class="empty-card__pulse"></span>
      {/if}
    </div>
    <div class="empty-card__titles">
      <CardTitle class="empty-card__title">{title}</CardTitle>
      {#if description}
        <CardDescription class="empty-card__description">{description}</CardDescription>
      {/if}
    </div>
    {#if badge}
      <Badge variant="outline" class="empty-card__badge">{badge}</Badge>
    {/if}
  </CardHeader>
  <CardContent class="empty-card__content">
    {@render children?.()}
    {#if actionLabel}
      <Button
        type="button"
        class="empty-card__action"
        onclick={onAction}
        disabled={!onAction}
      >
        {actionLabel}
      </Button>
    {/if}
  </CardContent>
</Card>
