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
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1
  );
}

function nextMonth() {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1
  );
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
      (start && date.getTime() === start.getTime()) ||
      (end && date.getTime() === end.getTime())
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
    class="rounded-md border border-outline-soft bg-background p-3 shadow-md {className}"
    {...props}
>
    <div class="flex items-center justify-between pb-4">
        <Button variant="outline" size="sm" onclick={previousMonth}>
            <ChevronLeft class="h-4 w-4" />
        </Button>
        <div class="text-sm font-medium">
            {monthNames[currentMonth.getMonth()]}
            {currentMonth.getFullYear()}
        </div>
        <Button variant="outline" size="sm" onclick={nextMonth}>
            <ChevronRight class="h-4 w-4" />
        </Button>
    </div>

    <div class="grid grid-cols-7 gap-1">
        {#each dayNames as day}
            <div
                class="text-center text-xs font-medium text-muted-foreground p-2"
            >
                {day}
            </div>
        {/each}

        {#each getDaysInMonth(currentMonth) as day}
            {#if day}
                <Button
                    variant={isSelected(day) ? "default" : "ghost"}
                    size="sm"
                    class="h-8 w-8 p-0 text-xs {isInRange(day) &&
                    !isSelected(day)
                        ? 'bg-primary/20'
                        : ''}"
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
