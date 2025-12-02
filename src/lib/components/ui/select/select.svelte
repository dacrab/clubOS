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

	function handleChange(newValue: string | undefined) {
		if (newValue !== undefined) {
			value = newValue;
			onValueChange?.(newValue);
		}
	}
</script>

<SelectPrimitive.Root 
	type="single"
	{value}
	onValueChange={handleChange}
	{disabled}
>
	{@render children?.()}
</SelectPrimitive.Root>
