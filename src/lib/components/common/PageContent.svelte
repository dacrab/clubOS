<script lang="ts">
const { class: className = "", children } = $props<{
  class?: string;
  children?: () => unknown;
}>();

const baseClass =
  "mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 md:gap-10";
const classes = className ? `${baseClass} ${className}` : baseClass;
</script>

<div class={classes}>
  {@render children?.()}
</div>
