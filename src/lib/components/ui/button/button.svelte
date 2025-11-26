<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
				destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				success: "bg-success text-success-foreground shadow-sm hover:bg-success/90",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-10 rounded-md px-6",
				xl: "h-12 rounded-lg px-8 text-base",
				icon: "h-9 w-9",
				"icon-sm": "h-8 w-8",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
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
