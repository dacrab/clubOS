<script lang="ts">
import { Card, CardContent } from "$lib/components/ui/card";

type StatItem = {
  title: string;
  value: string;
  accent?: "blue" | "green" | "yellow" | "red" | "purple" | "neutral";
  icon?: unknown;
};

const { items = [] as StatItem[] } = $props<{
  items?: StatItem[];
}>();

function getAccentClass(accent?: string) {
  switch (accent) {
    case "blue":
      return "bg-blue-500/10 text-blue-600";
    case "green":
      return "bg-green-500/10 text-green-600";
    case "yellow":
      return "bg-yellow-500/10 text-yellow-600";
    case "red":
      return "bg-red-500/10 text-red-600";
    case "purple":
      return "bg-purple-500/10 text-purple-600";
    case "neutral":
      return "bg-gray-500/10 text-gray-600";
    default:
      return "bg-primary/10 text-primary";
  }
}
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each items as item}
        <Card
            class="rounded-xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
        >
            <CardContent class="p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-muted-foreground">
                            {item.title}
                        </p>
                        <p class="text-2xl font-bold text-foreground">
                            {item.value}
                        </p>
                    </div>
                    {#if item.accent}
                        <div
                            class="h-3 w-3 rounded-full {getAccentClass(
                                item.accent,
                            )}"
                        ></div>
                    {/if}
                </div>
            </CardContent>
        </Card>
    {/each}
</div>
