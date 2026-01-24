<script lang="ts" module>
	import { cn } from "$lib/utils/cn";

	const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

	const variants = {
		default: "border-transparent bg-primary text-primary-foreground shadow",
		secondary: "border-transparent bg-secondary text-secondary-foreground",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
		success: "border-transparent bg-success text-success-foreground shadow",
		warning: "border-transparent bg-warning text-warning-foreground shadow",
		outline: "text-foreground",
	} as const;

	export type BadgeVariant = keyof typeof variants;

	export function badgeVariants(opts: { variant?: BadgeVariant; class?: string } = {}) {
		return cn(base, variants[opts.variant ?? "default"], opts.class);
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Props = HTMLAttributes<HTMLDivElement> & {
		variant?: BadgeVariant;
		class?: string;
		children?: Snippet;
	};

	let { variant = "default", class: className = "", children, ...restProps }: Props = $props();
</script>

<div class={badgeVariants({ variant, class: className })} {...restProps}>
	{@render children?.()}
</div>
