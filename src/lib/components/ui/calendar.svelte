<script lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";

let {
	value = $bindable(new Date()),
	start = $bindable(new Date()),
	end = $bindable(new Date()),
	mode = "single",
	class: className = "",
	...props
} = $props<{
	value?: Date;
	start?: Date;
	end?: Date;
	mode?: "single" | "range";
	class?: string;
	[key: string]: unknown;
}>();

let currentMonth = $state(new Date());

function getDaysInMonth(date: Date) {
	const year = date.getFullYear();
	const month = date.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const daysInMonth = lastDay.getDate();
	const startingDayOfWeek = firstDay.getDay();

	const days: (Date | null)[] = [];

	// Add empty cells for days before the first day of the month
	for (let i = 0; i < startingDayOfWeek; i++) {
		days.push(null);
	}

	// Add days of the month
	for (let day = 1; day <= daysInMonth; day++) {
		days.push(new Date(year, month, day));
	}

	return days;
}

function previousMonth() {
	currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
}

function nextMonth() {
	currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
}

function selectDate(date: Date) {
	if (mode === "range") {
		if (!start || (start && end)) {
			start = date;
			end = date;
		} else if (date < start) {
			end = start;
			start = date;
		} else {
			end = date;
		}
	} else {
		value = date;
	}
}

function isSelected(date: Date) {
	if (mode === "range") {
		return (
			(start && date.getTime() === start.getTime()) || (end && date.getTime() === end.getTime())
		);
	}
	return value && date.getTime() === value.getTime();
}

function isInRange(date: Date) {
	if (mode !== "range" || !start || !end) {
		return false;
	}
	return date >= start && date <= end;
}

const monthNames = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
</script>

<div
    class="rounded-md border border-border bg-background p-3 shadow-sm {className}"
    {...props}
>
    <div class="flex items-center justify-between pb-4">
        <Button variant="outline" size="icon" class="h-7 w-7" onclick={previousMonth}>
            <ChevronLeft class="h-4 w-4" />
        </Button>
        <div class="text-sm font-medium">
            {monthNames[currentMonth.getMonth()]}
            {currentMonth.getFullYear()}
        </div>
        <Button variant="outline" size="icon" class="h-7 w-7" onclick={nextMonth}>
            <ChevronRight class="h-4 w-4" />
        </Button>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-2">
        {#each dayNames as day}
            <div
                class="text-center text-[0.8rem] font-medium text-muted-foreground"
            >
                {day}
            </div>
        {/each}
    </div>

    <div class="grid grid-cols-7 gap-1">
        {#each getDaysInMonth(currentMonth) as day}
            {#if day}
                <Button
                    variant={isSelected(day) ? "default" : "ghost"}
                    size="sm"
                    class="h-8 w-8 p-0 text-sm font-normal aria-selected:opacity-100 {isInRange(day) && !isSelected(day) ? 'bg-accent text-accent-foreground rounded-none first:rounded-l-md last:rounded-r-md' : ''} {isSelected(day) ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground' : ''}"
                    onclick={() => selectDate(day)}
                >
                    {day.getDate()}
                </Button>
            {:else}
                <div class="h-8 w-8"></div>
            {/if}
        {/each}
    </div>
</div>
