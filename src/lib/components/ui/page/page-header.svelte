<script lang="ts">
const {
	title,
	subtitle,
	icon: Icon,
	children,
	class: className = "",
	...props
} = $props<{
	title: string;
	subtitle?: string;
	icon?: unknown;
	children?: unknown;
	class?: string;
	[key: string]: unknown;
}>();
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between {className}" {...props}>
    <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {#if subtitle}
            <p class="text-sm text-muted-foreground">{subtitle}</p>
        {/if}
    </div>
    {#if children}
        <div class="flex items-center gap-2">
            {@render children()}
        </div>
    {/if}
</div>
