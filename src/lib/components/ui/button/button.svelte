<script lang="ts" module>
	import { cn } from "$lib/utils/cn";

	const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-[color,background-color,border-color,box-shadow,transform] duration-[--duration-fast] ease-[--ease-out] active:scale-[0.97]";

	const variants = {
		default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
		destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
		outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
		secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
		ghost: "hover:bg-accent hover:text-accent-foreground",
		link: "text-primary underline-offset-4 hover:underline",
		success: "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md",
	} as const;

	const sizes = {
		default: "h-9 px-4 py-2",
		sm: "h-8 rounded-md px-3 text-xs",
		lg: "h-10 rounded-md px-6",
		xl: "h-12 rounded-lg px-8 text-base",
		icon: "h-9 w-9",
		"icon-sm": "h-8 w-8",
	} as const;

	export type ButtonVariant = keyof typeof variants;
	export type ButtonSize = keyof typeof sizes;

	export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize; class?: string } = {}) {
		return cn(base, variants[opts.variant ?? "default"], sizes[opts.size ?? "default"], opts.class);
	}
</script>

<script lang="ts">
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Props = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		href?: string;
		children?: Snippet;
	};

	let { variant = "default", size = "default", class: className = "", href, children, ...restProps }: Props = $props();
</script>

{#if href}
	<a href={href} class={buttonVariants({ variant, size, class: className })} {...restProps as HTMLAnchorAttributes}>
		{@render children?.()}
	</a>
{:else}
	<button class={buttonVariants({ variant, size, class: className })} {...restProps as HTMLButtonAttributes}>
		{@render children?.()}
	</button>
{/if}
