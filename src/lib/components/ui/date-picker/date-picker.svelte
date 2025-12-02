<script lang="ts">
	import { onMount } from "svelte";
	import flatpickr from "flatpickr";
	import type { Instance } from "flatpickr/dist/types/instance";
	import "flatpickr/dist/flatpickr.min.css";
	import { cn } from "$lib/utils/cn";

	type Props = {
		value?: string;
		placeholder?: string;
		enableTime?: boolean;
		dateFormat?: string;
		minDate?: string | Date;
		maxDate?: string | Date;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	};

	let {
		value = $bindable(""),
		placeholder = "Select date...",
		enableTime = false,
		dateFormat = "Y-m-d",
		minDate,
		maxDate,
		disabled = false,
		class: className,
		onchange,
	}: Props = $props();

	let inputEl: HTMLInputElement;
	let fp: Instance;

	onMount(() => {
		fp = flatpickr(inputEl, {
			defaultDate: value || undefined,
			enableTime,
			dateFormat,
			minDate,
			maxDate,
			time_24hr: true,
			onChange: (selectedDates, dateStr) => {
				value = dateStr;
				onchange?.(dateStr);
			},
		});

		return () => {
			fp?.destroy();
		};
	});

	$effect(() => {
		if (fp && value !== fp.input.value) {
			fp.setDate(value, false);
		}
	});
</script>

<input
	bind:this={inputEl}
	type="text"
	{placeholder}
	{disabled}
	class={cn(
		"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
/>

<style>
	:global(.flatpickr-calendar) {
		background: hsl(var(--popover));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
	}
	:global(.flatpickr-calendar.arrowTop::before),
	:global(.flatpickr-calendar.arrowTop::after) {
		border-bottom-color: hsl(var(--border));
	}
	:global(.flatpickr-calendar.arrowBottom::before),
	:global(.flatpickr-calendar.arrowBottom::after) {
		border-top-color: hsl(var(--border));
	}
	:global(.flatpickr-months) {
		padding: 0.5rem;
	}
	:global(.flatpickr-months .flatpickr-month) {
		color: hsl(var(--foreground));
		fill: hsl(var(--foreground));
	}
	:global(.flatpickr-current-month) {
		font-size: 1rem;
	}
	:global(.flatpickr-current-month input.cur-year) {
		color: hsl(var(--foreground));
	}
	:global(.flatpickr-months .flatpickr-prev-month),
	:global(.flatpickr-months .flatpickr-next-month) {
		color: hsl(var(--foreground));
		fill: hsl(var(--foreground));
	}
	:global(.flatpickr-months .flatpickr-prev-month:hover),
	:global(.flatpickr-months .flatpickr-next-month:hover) {
		color: hsl(var(--primary));
		fill: hsl(var(--primary));
	}
	:global(.flatpickr-weekdays) {
		background: transparent;
	}
	:global(.flatpickr-weekday) {
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}
	:global(.flatpickr-day) {
		color: hsl(var(--foreground));
		border-radius: var(--radius);
	}
	:global(.flatpickr-day:hover) {
		background: hsl(var(--accent));
		border-color: hsl(var(--accent));
	}
	:global(.flatpickr-day.selected),
	:global(.flatpickr-day.selected:hover) {
		background: hsl(var(--primary));
		border-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}
	:global(.flatpickr-day.today) {
		border-color: hsl(var(--primary));
	}
	:global(.flatpickr-day.today:hover) {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}
	:global(.flatpickr-day.prevMonthDay),
	:global(.flatpickr-day.nextMonthDay) {
		color: hsl(var(--muted-foreground));
	}
	:global(.flatpickr-day.disabled) {
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}
	:global(.flatpickr-time) {
		border-top: 1px solid hsl(var(--border));
	}
	:global(.flatpickr-time input) {
		color: hsl(var(--foreground));
	}
	:global(.flatpickr-time .flatpickr-am-pm) {
		color: hsl(var(--foreground));
	}
	:global(.flatpickr-time input:hover),
	:global(.flatpickr-time .flatpickr-am-pm:hover) {
		background: hsl(var(--accent));
	}
</style>
