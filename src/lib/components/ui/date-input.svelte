<script lang="ts">
import { Calendar as CalendarIcon } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import Calendar from "$lib/components/ui/calendar.svelte";
import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
import {
	getLocalTimeZone,
	today,
	parseDate,
	type DateValue,
} from "@internationalized/date";
import { cn } from "$lib/utils/utils";

let {
	value = $bindable(""),
	placeholder = "Select date",
	class: className = "",
}: {
	value: string;
	placeholder?: string;
	class?: string;
} = $props();

let open = $state(false);

let calendarValue = $state<DateValue>(
	value ? parseDate(value) : today(getLocalTimeZone())
);

$effect(() => {
	if (value) {
		try {
			calendarValue = parseDate(value);
		} catch {
			calendarValue = today(getLocalTimeZone());
		}
	}
});

function handleCalendarChange(newValue: DateValue | undefined) {
	if (newValue) {
		calendarValue = newValue;
		value = `${newValue.year}-${String(newValue.month).padStart(2, "0")}-${String(newValue.day).padStart(2, "0")}`;
		open = false;
	}
}

function formatDisplayDate(iso: string): string {
	if (!iso) return placeholder;
	try {
		const d = parseDate(iso);
		return `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;
	} catch {
		return placeholder;
	}
}
</script>

<Popover bind:open>
	<PopoverTrigger>
		<Button
			as="span"
			variant="outline"
			class={cn("justify-start text-left font-normal", !value && "text-muted-foreground", className)}
		>
			<CalendarIcon class="mr-2 h-4 w-4" />
			{formatDisplayDate(value)}
		</Button>
	</PopoverTrigger>
	<PopoverContent class="w-auto p-0" align="start">
		<Calendar bind:value={calendarValue} onValueChange={handleCalendarChange} />
	</PopoverContent>
</Popover>
