<script lang="ts">
import { ClerkProvider } from "svelte-clerk";

const { children } = $props();
</script>

<ClerkProvider>
	{@render children()}
</ClerkProvider>
