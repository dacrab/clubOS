<script lang="ts">
  let { title, children } = $props<{ title: string; children?: any }>();
</script>

<div class="flex items-center justify-between gap-2">
  <h1 class="text-2xl font-semibold">{title}</h1>
  <div class="flex items-center gap-2">
    {@render children?.()}
  </div>
</div>
