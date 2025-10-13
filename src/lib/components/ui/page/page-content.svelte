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
    class="flex flex-1 flex-col gap-6 px-6 py-6 md:px-10 {className}"
    {...props}
>
    {@render children()}
</div>
