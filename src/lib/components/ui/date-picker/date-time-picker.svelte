<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
	import Calendar from "$lib/components/ui/calendar/calendar.svelte";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils/cn";
	import { CalendarIcon } from "@lucide/svelte";
	import { t } from "$lib/i18n/index.svelte";
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDateTime,
		today,
		type DateValue,
	} from "@internationalized/date";

	type Props = {
		value?: string;
		placeholder?: string;
		enableTime?: boolean;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	};

	let {
		value = $bindable(""),
		placeholder = "Select date...",
		enableTime = false,
		disabled = false,
		class: className,
		onchange,
	}: Props = $props();

	let open = $state(false);
	let hours = $state("12");
	let minutes = $state("00");

	const df = new DateFormatter("en-US", { dateStyle: "long" });
	const dtf = new DateFormatter("en-US", { dateStyle: "long", timeStyle: "short" });

	function parseValue(val: string): { date: DateValue | undefined; h: string; m: string } {
		if (!val) return { date: undefined, h: "12", m: "00" };
		try {
			if (val.includes("T") || val.includes(" ")) {
				const normalized = val.replace(" ", "T");
				const dt = parseDateTime(normalized.slice(0, 16));
				return {
					date: new CalendarDate(dt.year, dt.month, dt.day),
					h: dt.hour.toString().padStart(2, "0"),
					m: dt.minute.toString().padStart(2, "0"),
				};
			}
			const [y, m, d] = val.split("-").map(Number);
			return { date: new CalendarDate(y, m, d), h: "12", m: "00" };
		} catch {
			return { date: undefined, h: "12", m: "00" };
		}
	}

	const parsed = $derived(parseValue(value));
	const calendarValue = $derived(parsed.date);

	$effect(() => {
		hours = parsed.h;
		minutes = parsed.m;
	});

	function formatOutput(date: DateValue | undefined, h: string, m: string): string {
		if (!date) return "";
		const year = date.year;
		const month = date.month.toString().padStart(2, "0");
		const day = date.day.toString().padStart(2, "0");
		if (enableTime) {
			return `${year}-${month}-${day} ${h}:${m}`;
		}
		return `${year}-${month}-${day}`;
	}

	function handleDateSelect(newDate: DateValue | undefined) {
		const newValue = formatOutput(newDate, hours, minutes);
		value = newValue;
		onchange?.(newValue);
		if (!enableTime) {
			open = false;
		}
	}

	function handleTimeChange() {
		if (calendarValue) {
			const newValue = formatOutput(calendarValue, hours, minutes);
			value = newValue;
			onchange?.(newValue);
		}
	}

	function handleApply() {
		open = false;
	}

	const displayValue = $derived(() => {
		if (!calendarValue) return placeholder;
		if (enableTime) {
			const date = new Date(calendarValue.year, calendarValue.month - 1, calendarValue.day, parseInt(hours), parseInt(minutes));
			return dtf.format(date);
		}
		return df.format(calendarValue.toDate(getLocalTimeZone()));
	});
</script>

<Popover bind:open>
	<PopoverTrigger>
		<Button
			variant="outline"
			{disabled}
			class={cn(
				"w-full justify-start text-left font-normal",
				!calendarValue && "text-muted-foreground",
				className
			)}
		>
			<CalendarIcon class="mr-2 h-4 w-4" />
			{displayValue()}
		</Button>
	</PopoverTrigger>
	<PopoverContent class="w-auto p-0" align="start">
		<Calendar
			value={calendarValue}
			onValueChange={handleDateSelect}
			placeholder={today(getLocalTimeZone())}
		/>
		{#if enableTime}
			<div class="border-t p-3">
				<div class="flex items-center justify-center gap-2">
					<span class="text-sm text-muted-foreground">{t("calendar.time")}:</span>
					<input
						type="number"
						min="0"
						max="23"
						bind:value={hours}
						onchange={handleTimeChange}
						class="w-14 rounded-md border bg-background px-2 py-1 text-center text-sm"
					/>
					<span class="text-sm font-medium">:</span>
					<input
						type="number"
						min="0"
						max="59"
						bind:value={minutes}
						onchange={handleTimeChange}
						class="w-14 rounded-md border bg-background px-2 py-1 text-center text-sm"
					/>
				</div>
				<Button class="mt-3 w-full" size="sm" onclick={handleApply}>
					{t("calendar.apply")}
				</Button>
			</div>
		{/if}
	</PopoverContent>
</Popover>
