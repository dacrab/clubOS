<script lang="ts">
import { Moon, Sun } from "@lucide/svelte";
import Button from "$lib/components/ui/button/button.svelte";
import { theme } from "$lib/state/theme.svelte";
</script>

<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>
	{#if theme.isDark}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
