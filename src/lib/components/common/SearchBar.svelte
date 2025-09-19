<script lang="ts">
  import Input from '$lib/components/ui/input/input.svelte';
  let { value = $bindable(''), placeholder = 'Search...' } = $props<{ value: string; placeholder?: string }>();
</script>

<Input bind:value class="w-full" placeholder={placeholder} />
