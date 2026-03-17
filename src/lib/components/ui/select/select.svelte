<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = {
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		children?: Snippet;
	};

	let { value = $bindable(""), onValueChange, disabled = false, children }: Props = $props();
</script>

<SelectPrimitive.Root
	type="single"
	{value}
	onValueChange={(v) => { if (v !== undefined) { value = v; onValueChange?.(v); } }}
	{disabled}
>
	{@render children?.()}
</SelectPrimitive.Root>
