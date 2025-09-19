<script lang="ts">
  let { text, children } = $props<{ text: string; children?: any }>();
</script>

<div class="text-sm text-muted-foreground p-6 border rounded-md text-center">
  <div>{text}</div>
  <div class="mt-3">{@render children?.()}</div>
</div>
