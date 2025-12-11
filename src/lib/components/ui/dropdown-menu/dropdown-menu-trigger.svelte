<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { buttonVariants } from "$lib/components/ui/button/button.svelte";

	type Props = DropdownMenuPrimitive.TriggerProps & {
		class?: string;
		children?: Snippet;
		variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success";
		size?: "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm";
	};

	let { class: className = "", children, variant = "ghost", size = "icon", ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Trigger class={buttonVariants({ variant, size, class: className })} {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Trigger>
