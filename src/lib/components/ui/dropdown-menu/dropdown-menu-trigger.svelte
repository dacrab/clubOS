<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children }: Props = $props();
</script>

<DropdownMenuPrimitive.Trigger class={className}>
	{@render children?.()}
</DropdownMenuPrimitive.Trigger>
