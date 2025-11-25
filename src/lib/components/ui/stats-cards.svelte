<script lang="ts">
import { Card } from "$lib/components/ui/card";

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
			return "text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300";
		case "green":
			return "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300";
		case "yellow":
			return "text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300";
		case "red":
			return "text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
		case "purple":
			return "text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300";
		case "neutral":
			return "text-foreground bg-muted";
		default:
			return "text-primary bg-primary/10";
	}
}
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each items as item (item.title)}
        <Card class="transition-all hover:shadow-md">
            <div class="p-6 flex items-center justify-between">
                <div class="space-y-1">
                    <p class="text-sm font-medium text-muted-foreground">
                        {item.title}
                    </p>
                    <p class="text-2xl font-bold tracking-tight">
                        {item.value}
                    </p>
                </div>
                {#if item.icon}
                    {@const Icon = item.icon}
                    <div class="grid size-10 place-items-center rounded-full {getAccentClass(item.accent)}">
                        <Icon class="size-5" />
                    </div>
                {/if}
            </div>
        </Card>
    {/each}
</div>
