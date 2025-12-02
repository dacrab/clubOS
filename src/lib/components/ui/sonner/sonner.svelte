<script lang="ts">
	import { Toaster as SonnerToaster, type ToasterProps } from "svelte-sonner";
	import { theme } from "$lib/state/theme.svelte";

	type Props = ToasterProps;

	let { ...restProps }: Props = $props();

	const toastTheme = $derived(theme.isDark ? "dark" : "light");
</script>

<SonnerToaster
	theme={toastTheme}
	position="top-center"
	gap={8}
	toastOptions={{
		unstyled: true,
		classes: {
			toast: "flex items-center gap-3 w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg",
			title: "text-sm font-medium",
			description: "text-sm opacity-80",
			success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
			error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
			warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
			info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
			default: "bg-white border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100",
			loading: "bg-white border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100",
			actionButton: "bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-medium hover:opacity-90",
			cancelButton: "bg-muted text-muted-foreground rounded px-2 py-1 text-xs font-medium hover:opacity-80",
			closeButton: "absolute top-1 right-1 p-1 rounded opacity-50 hover:opacity-100 transition-opacity",
		},
	}}
	{...restProps}
/>
