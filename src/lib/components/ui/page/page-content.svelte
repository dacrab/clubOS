<script lang="ts">
const {
	children,
	class: className = "",
	...props
} = $props<{
	children: unknown;
	class?: string;
	[key: string]: unknown;
}>();
</script>

<div
    class="flex flex-col gap-8 {className}"
    {...props}
>
    {@render children()}
</div>
