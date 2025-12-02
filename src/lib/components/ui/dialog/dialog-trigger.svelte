<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children }: Props = $props();
</script>

<DialogPrimitive.Trigger class={className}>
	{@render children?.()}
</DialogPrimitive.Trigger>
