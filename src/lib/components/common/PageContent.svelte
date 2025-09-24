<script lang="ts">
const { class: className = "", children } = $props<{
  class?: string;
  children?: () => unknown;
}>();

const baseClass = "mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10";
const classes = className ? `${baseClass} ${className}` : baseClass;
</script>

<div class={classes}>
  {@render children?.()}
</div>
