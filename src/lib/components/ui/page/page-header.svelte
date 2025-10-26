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

<div class="flex items-center justify-between {className}" {...props}>
    <div class="flex items-center gap-4">
        {#if Icon}
            <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"
            >
                <Icon class="h-6 w-6 text-primary" />
            </div>
        {/if}
        <div>
            <h1 class="text-2xl font-semibold text-foreground">{title}</h1>
            {#if subtitle}
                <p class="text-sm text-muted-foreground">{subtitle}</p>
            {/if}
        </div>
    </div>
    {#if children}
        <div class="flex items-center gap-2">
            {@render children()}
        </div>
    {/if}
</div>
